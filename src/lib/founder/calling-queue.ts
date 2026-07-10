import "server-only";
import { prisma } from "@/lib/prisma";

const orderInclude = {
  address: true,
  user: { select: { name: true, email: true } },
  items: { include: { product: { select: { title: true } }, variant: { select: { size: true, color: true } } } },
  callLogs: { orderBy: { createdAt: "desc" as const }, take: 5 },
};

export async function getTodaysOrders() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return prisma.order.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getFollowUpQueue() {
  return prisma.order.findMany({
    where: { contactStatus: { in: ["NO_RESPONSE", "CALLBACK_REQUESTED"] } },
    include: orderInclude,
    orderBy: { nextFollowUpAt: "asc" },
  });
}

export type CallingQueueOrder = Awaited<ReturnType<typeof getTodaysOrders>>[number];
