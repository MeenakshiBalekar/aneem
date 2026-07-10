import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSchema } from "@/lib/validations/checkout";
import { verifyPaymentSignature } from "@/lib/razorpay/client";
import { pushOrderToQikink } from "@/lib/qikink/orders";
import { notifyOrderConfirmed } from "@/lib/orders/order-events";

// Called by the client immediately after Razorpay Checkout succeeds.
// The webhook in /api/webhooks/razorpay is the durable fallback for this
// same transition, so a dropped connection here still results in a
// correctly-confirmed order once the webhook arrives.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json();
  const parsed = verifyPaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.razorpayOrderId !== razorpayOrderId) {
    return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
  }

  const valid = verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
  if (!valid) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "PAYMENT_FAILED" } });
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  if (order.status === "PENDING_PAYMENT") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID", razorpayPaymentId, razorpaySignature },
    });
    await prisma.cart.updateMany({ where: { userId: session.user.id }, data: {} });
    await prisma.cartItem.deleteMany({ where: { cart: { userId: session.user.id } } });
    await pushOrderToQikink(order.id);
    await notifyOrderConfirmed(order.id);
  }

  return NextResponse.json({ success: true, orderNumber: order.orderNumber });
}
