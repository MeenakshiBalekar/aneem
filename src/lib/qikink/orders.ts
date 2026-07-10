import "server-only";
import { prisma } from "@/lib/prisma";
import { qikinkClient } from "./client";
import type { QikinkCreateOrderPayload } from "./types";

/**
 * Pushes a confirmed order (paid via Razorpay, or COD-confirmed) to Qikink
 * for production + fulfillment. Called from the Razorpay payment-verification
 * route and from the COD checkout route — this is the single choke point
 * so "order placed on Aneem" always means "order exists in Qikink".
 */
export async function pushOrderToQikink(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { variant: true } }, address: true },
  });

  if (order.qikinkOrderId) return order; // already pushed — idempotent

  const payload: QikinkCreateOrderPayload = {
    order_number: order.orderNumber,
    line_items: order.items.map((item) => ({
      sku: item.variant.sku,
      quantity: item.quantity,
      price: Number(item.unitPrice),
    })),
    shipping_address: {
      name: order.address.fullName,
      phone: order.address.phone,
      address_line1: order.address.line1,
      address_line2: order.address.line2 ?? undefined,
      city: order.address.city,
      state: order.address.state,
      pincode: order.address.pincode,
      country: order.address.country,
    },
    payment_status: order.paymentMethod === "COD" ? "cod" : "prepaid",
    total_order_value: Number(order.total),
  };

  try {
    const result = await qikinkClient.createOrder(payload);
    return prisma.order.update({
      where: { id: order.id },
      data: { qikinkOrderId: result.order_id, status: "SENT_TO_QIKINK" },
    });
  } catch (err) {
    await prisma.syncLog.create({
      data: {
        jobType: "ORDER_PUSH",
        status: "FAILED",
        itemsFailed: 1,
        errorMessage: err instanceof Error ? err.message : String(err),
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}
