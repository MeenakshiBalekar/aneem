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
    include: { items: { include: { variant: true } }, address: true, user: { select: { email: true } } },
  });

  if (order.qikinkOrderId) return order; // already pushed — idempotent

  const [firstName, ...rest] = order.address.fullName.trim().split(/\s+/);

  const payload: QikinkCreateOrderPayload = {
    order_number: order.orderNumber,
    qikink_shipping: "1", // Qikink handles shipment — we don't self-ship
    gateway: order.paymentMethod === "COD" ? "COD" : "Prepaid",
    total_order_value: String(order.total),
    line_items: order.items.map((item) => ({
      search_from_my_products: 1, // our catalog is already pushed/designed in Qikink
      sku: item.variant.sku,
      quantity: String(item.quantity),
      price: String(item.unitPrice),
    })),
    shipping_address: {
      first_name: firstName,
      last_name: rest.join(" ") || undefined,
      address1: order.address.line1,
      address2: order.address.line2 ?? undefined,
      phone: order.address.phone,
      email: order.user.email,
      city: order.address.city,
      zip: order.address.pincode,
      province: order.address.state,
      country_code: "IN", // storefront is India-only; Address.country is a free-text label, not an ISO code
    },
  };

  try {
    const result = await qikinkClient.createOrder(payload);
    return prisma.order.update({
      where: { id: order.id },
      data: { qikinkOrderId: String(result.order_id), status: "SENT_TO_QIKINK" },
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
