import "server-only";
import { prisma } from "@/lib/prisma";
import { whatsapp } from "@/lib/notifications/whatsapp";
import { email } from "@/lib/notifications/email";

/**
 * Single choke point for "notify the customer" — called after payment
 * confirmation and after every Qikink fulfillment webhook. Idempotent via
 * the notifiedShipped/notifiedDelivered flags so a re-delivered webhook
 * doesn't spam the customer twice.
 */
export async function notifyOrderConfirmed(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { user: true, address: true },
  });

  const params = { toPhone: order.address.phone, toEmail: order.user.email, customerName: order.address.fullName, orderNumber: order.orderNumber, total: Number(order.total), invoiceUrl: order.invoiceUrl ?? undefined };

  await Promise.allSettled([whatsapp.orderConfirmed(params), email.orderConfirmed(params)]);
}

export async function notifyOrderShipped(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { user: true, address: true },
  });
  if (order.notifiedShipped) return;

  const params = {
    toPhone: order.address.phone,
    toEmail: order.user.email,
    customerName: order.address.fullName,
    orderNumber: order.orderNumber,
    total: Number(order.total),
    trackingUrl: order.trackingUrl ?? undefined,
  };

  await Promise.allSettled([whatsapp.orderShipped(params), email.orderShipped(params)]);
  await prisma.order.update({ where: { id: order.id }, data: { notifiedShipped: true } });
}

export async function notifyOrderDelivered(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { user: true, address: true },
  });
  if (order.notifiedDelivered) return;

  const params = { toPhone: order.address.phone, toEmail: order.user.email, customerName: order.address.fullName, orderNumber: order.orderNumber, total: Number(order.total) };

  await Promise.allSettled([whatsapp.orderDelivered(params), email.orderDelivered(params)]);
  await prisma.order.update({ where: { id: order.id }, data: { notifiedDelivered: true } });
}
