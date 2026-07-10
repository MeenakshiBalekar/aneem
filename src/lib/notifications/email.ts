import "server-only";
import { Resend } from "resend";
import { formatINR } from "@/lib/utils";

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "Aneem <orders@aneem.in>";

const resend = API_KEY ? new Resend(API_KEY) : null;

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.info(`[email:mock] would send "${subject}" to ${to}`);
    return { mocked: true };
  }
  return resend.emails.send({ from: FROM, to, subject, html });
}

interface OrderEmailParams {
  toEmail: string;
  customerName: string;
  orderNumber: string;
  total: number;
  trackingUrl?: string;
  invoiceUrl?: string;
}

export const email = {
  orderConfirmed: (p: OrderEmailParams) =>
    send(
      p.toEmail,
      `Order ${p.orderNumber} confirmed — Aneem`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Thanks for your order, ${p.customerName}!</h2>
        <p>Order <strong>${p.orderNumber}</strong> is confirmed. Total: <strong>${formatINR(p.total)}</strong>.</p>
        ${p.invoiceUrl ? `<p><a href="${p.invoiceUrl}">Download invoice</a></p>` : ""}
        <p>We'll notify you as soon as it ships.</p>
      </div>`,
    ),
  orderShipped: (p: OrderEmailParams) =>
    send(
      p.toEmail,
      `Order ${p.orderNumber} has shipped — Aneem`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Your order is on its way, ${p.customerName}!</h2>
        <p>Order <strong>${p.orderNumber}</strong> has shipped.</p>
        ${p.trackingUrl ? `<p><a href="${p.trackingUrl}">Track your order</a></p>` : ""}
      </div>`,
    ),
  orderDelivered: (p: OrderEmailParams) =>
    send(
      p.toEmail,
      `Order ${p.orderNumber} delivered — Aneem`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Delivered! Hope you love it, ${p.customerName}.</h2>
        <p>Order <strong>${p.orderNumber}</strong> was delivered. Tag us on Instagram @aneem for a feature.</p>
      </div>`,
    ),
};
