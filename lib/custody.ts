import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const CUSTODY_LOW_THRESHOLD = 1000;

/** Global custody balance across all cycles (deposits − withdrawals). */
export async function getCustodyBalance(): Promise<number> {
  const [dep, wd] = await Promise.all([
    prisma.custodyDeposit.aggregate({ _sum: { amount: true } }),
    prisma.custodyWithdrawal.aggregate({ _sum: { amount: true } }),
  ]);
  const deposits = Number(dep._sum.amount ?? new Prisma.Decimal(0));
  const withdrawals = Number(wd._sum.amount ?? new Prisma.Decimal(0));
  return Number((deposits - withdrawals).toFixed(2));
}

/** Custody spent attributable to a specific cycle (for P&L). */
export async function getCycleCustodySpend(cycleId: string): Promise<number> {
  const agg = await prisma.custodyWithdrawal.aggregate({
    _sum: { amount: true },
    where: { cycleId },
  });
  return Number(agg._sum.amount ?? new Prisma.Decimal(0));
}
