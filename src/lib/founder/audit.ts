import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrderContactStatus, Prisma } from "@prisma/client";

export async function logFounderLoginAttempt(params: {
  email: string;
  ipAddress: string;
  userAgent?: string | null;
  success: boolean;
  failureReason?: string;
}) {
  await prisma.founderLoginAttempt.create({
    data: {
      email: params.email,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent ?? undefined,
      success: params.success,
      failureReason: params.failureReason,
    },
  });
}

export async function logFounderAction(params: {
  founderUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  await prisma.founderAuditLog.create({
    data: {
      founderUserId: params.founderUserId ?? undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
      ipAddress: params.ipAddress ?? undefined,
    },
  });
}

export type { OrderContactStatus };
