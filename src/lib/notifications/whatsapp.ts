import "server-only";

// WhatsApp Cloud API (Meta) sender for order lifecycle notifications.
// Safe no-op when credentials aren't set — logs instead of throwing, so
// order automation never breaks because a notification channel is unconfigured.

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

function isConfigured() {
  return Boolean(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

interface OrderNotificationParams {
  toPhone: string;
  customerName: string;
  orderNumber: string;
  trackingUrl?: string;
}

async function sendTemplate(toPhone: string, templateName: string, params: string[]) {
  if (!isConfigured()) {
    console.info(`[whatsapp:mock] would send "${templateName}" to ${toPhone} with params`, params);
    return { mocked: true };
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ACCESS_TOKEN}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
      },
    }),
  });

  if (!res.ok) throw new Error(`WhatsApp send failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export const whatsapp = {
  orderConfirmed: (p: OrderNotificationParams) =>
    sendTemplate(p.toPhone, "order_confirmed", [p.customerName, p.orderNumber]),
  orderShipped: (p: OrderNotificationParams) =>
    sendTemplate(p.toPhone, "order_shipped", [p.customerName, p.orderNumber, p.trackingUrl ?? ""]),
  orderDelivered: (p: OrderNotificationParams) =>
    sendTemplate(p.toPhone, "order_delivered", [p.customerName, p.orderNumber]),
};
