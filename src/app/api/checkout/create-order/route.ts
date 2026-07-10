import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validations/checkout";
import { evaluateDiscounts } from "@/lib/discounts/engine";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/razorpay/client";
import { pushOrderToQikink } from "@/lib/qikink/orders";
import { notifyOrderConfirmed } from "@/lib/orders/order-events";
import { generateOrderNumber } from "@/lib/utils";

const COD_FEE = 49;

// Prices, stock, and discounts are always recomputed server-side from the
// database — the client only tells us *which* variants and quantities,
// never the price. This is the one place a manipulated cart payload gets
// corrected before money changes hands.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: { items: { include: { product: true, variant: true } } },
  });
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  for (const item of cart.items) {
    if (item.variant.isOutOfStock || item.variant.stock < item.quantity) {
      return NextResponse.json(
        { error: `${item.product.title} (${item.variant.size}) is out of stock` },
        { status: 409 },
      );
    }
  }

  let addressId = parsed.data.addressId;
  if (!addressId && parsed.data.address) {
    const created = await prisma.address.create({ data: { ...parsed.data.address, userId: session.user.id } });
    addressId = created.id;
  }
  if (!addressId) return NextResponse.json({ error: "Address is required" }, { status: 400 });

  const lines = cart.items.map((item) => ({
    productId: item.productId,
    categoryId: item.product.categoryId,
    quantity: item.quantity,
    unitPrice: Number(item.variant.price),
  }));

  const evaluation = await evaluateDiscounts(lines, { couponCode: parsed.data.couponCode });
  const codFee = parsed.data.paymentMethod === "COD" ? COD_FEE : 0;
  const total = evaluation.subtotal - evaluation.totalDiscount + evaluation.shippingAmount + codFee;

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: session.user.id,
      addressId,
      subtotal: evaluation.subtotal,
      discountAmount: evaluation.totalDiscount,
      shippingAmount: evaluation.shippingAmount,
      codFee,
      total,
      appliedDiscountCode: parsed.data.couponCode,
      paymentMethod: parsed.data.paymentMethod,
      status: "PENDING_PAYMENT",
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.variant.price,
          totalPrice: Number(item.variant.price) * item.quantity,
        })),
      },
    },
  });

  if (parsed.data.paymentMethod === "COD") {
    await prisma.order.update({ where: { id: order.id }, data: { status: "COD_CONFIRMED" } });
    await prisma.cart.update({ where: { id: cart.id }, data: { items: { deleteMany: {} } } });
    await pushOrderToQikink(order.id);
    await notifyOrderConfirmed(order.id);
    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber, paymentMethod: "COD" });
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Online payment is not configured yet. Please choose Cash on Delivery." },
      { status: 503 },
    );
  }

  const razorpayOrder = await createRazorpayOrder(total, order.orderNumber);
  await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: razorpayOrder.id } });

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
