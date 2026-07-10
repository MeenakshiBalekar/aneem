import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay/client";
import { pushOrderToQikink } from "@/lib/qikink/orders";
import { notifyOrderConfirmed } from "@/lib/orders/order-events";

// Server-to-server fallback for payment confirmation — covers the case where
// the customer's browser closes/loses connection right after paying, before
// the client-side verify call in /api/checkout/verify can run.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment.captured") {
    const razorpayOrderId = event.payload.payment.entity.order_id as string;
    const razorpayPaymentId = event.payload.payment.entity.id as string;

    const order = await prisma.order.findFirst({ where: { razorpayOrderId } });
    if (order && order.status === "PENDING_PAYMENT") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID", razorpayPaymentId },
      });
      await pushOrderToQikink(order.id);
      await notifyOrderConfirmed(order.id);
    }
  }

  if (event.event === "payment.failed") {
    const razorpayOrderId = event.payload.payment.entity.order_id as string;
    const order = await prisma.order.findFirst({ where: { razorpayOrderId } });
    if (order && order.status === "PENDING_PAYMENT") {
      await prisma.order.update({ where: { id: order.id }, data: { status: "PAYMENT_FAILED" } });
    }
  }

  return NextResponse.json({ received: true });
}

export const dynamic = "force-dynamic";
