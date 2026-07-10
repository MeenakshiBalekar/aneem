import { NextResponse } from "next/server";
import {
  applyFulfillmentUpdate,
  applyInventoryUpdate,
  upsertProductFromQikink,
  verifyQikinkWebhookSignature,
} from "@/lib/qikink/sync";
import { notifyOrderShipped, notifyOrderDelivered } from "@/lib/orders/order-events";
import type { QikinkWebhookPayload } from "@/lib/qikink/types";

// Receives push events from Qikink: product/price/stock changes and
// fulfillment/tracking updates. This — plus the scheduled full sync — is
// what keeps the storefront in sync with Qikink without any manual step.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-qikink-signature");

  if (!verifyQikinkWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as QikinkWebhookPayload;

  switch (payload.event) {
    case "product.updated": {
      await upsertProductFromQikink(payload.data as never);
      break;
    }
    case "inventory.updated": {
      await applyInventoryUpdate(payload.data as { sku: string; quantity: number }[]);
      break;
    }
    case "order.fulfillment_updated": {
      const update = payload.data as never as Parameters<typeof applyFulfillmentUpdate>[0];
      const order = await applyFulfillmentUpdate(update);
      if (order?.status === "SHIPPED") await notifyOrderShipped(order.id);
      if (order?.status === "DELIVERED") await notifyOrderDelivered(order.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

export const dynamic = "force-dynamic";
