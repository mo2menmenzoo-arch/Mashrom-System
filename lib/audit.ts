import { prisma } from "@/lib/db";
import { AuditAction, Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient | typeof prisma;

type AuditInput<T> = {
  tx?: TxClient;
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  result: T;
};

/**
 * Record a single audit log entry. Safe to call inside a prisma.$transaction
 * by passing `tx`.
 */
export async function writeAudit<T>({
  tx,
  userId,
  action,
  entity,
  entityId,
  before,
  after,
  reason,
  result,
}: AuditInput<T>): Promise<T> {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      before: before == null ? Prisma.JsonNull : (before as Prisma.InputJsonValue),
      after: after == null ? Prisma.JsonNull : (after as Prisma.InputJsonValue),
      reason: reason ?? null,
    },
  });
  return result;
}

/**
 * Wrap a mutation: runs inside a transaction, captures before/after, and
 * writes one AuditLog row atomically.
 */
export async function withAudit<T>(args: {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: (result: T) => string | Promise<string>;
  before?: unknown;
  reason?: string;
  mutate: (tx: Prisma.TransactionClient) => Promise<T>;
  captureAfter?: (result: T, tx: Prisma.TransactionClient) => Promise<unknown> | unknown;
}): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const result = await args.mutate(tx);
    const after = args.captureAfter ? await args.captureAfter(result, tx) : result;
    const entityId = await args.entityId(result);
    return writeAudit({
      tx,
      userId: args.userId,
      action: args.action,
      entity: args.entity,
      entityId,
      before: args.before,
      after,
      reason: args.reason,
      result,
    });
  });
}
