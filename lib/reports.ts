import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCycleCustodySpend } from "@/lib/custody";

export type CyclePnL = {
  cycleId: string;
  cycleNumber: number;
  revenue: number;
  expenses: number;
  custody: number;
  net: number;
  cartonsSold: number;
  totalPaid: number;
  totalUnpaid: number;
};

export async function getCyclePnL(cycleId: string): Promise<CyclePnL> {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    select: { id: true, number: true },
  });
  if (!cycle) throw new Error("Cycle not found");

  const [salesAgg, expenseAgg, custody] = await Promise.all([
    prisma.sale.aggregate({
      where: { cycleId },
      _sum: { total: true, paid: true, cartons: true },
    }),
    prisma.expense.aggregate({
      where: { cycleId },
      _sum: { amount: true },
    }),
    getCycleCustodySpend(cycleId),
  ]);

  const revenue = Number(salesAgg._sum.total ?? new Prisma.Decimal(0));
  const paid = Number(salesAgg._sum.paid ?? new Prisma.Decimal(0));
  const cartonsSold = salesAgg._sum.cartons ?? 0;
  const expenses = Number(expenseAgg._sum.amount ?? new Prisma.Decimal(0));
  const net = Number((revenue - expenses - custody).toFixed(2));

  return {
    cycleId: cycle.id,
    cycleNumber: cycle.number,
    revenue,
    expenses,
    custody,
    net,
    cartonsSold,
    totalPaid: paid,
    totalUnpaid: Number((revenue - paid).toFixed(2)),
  };
}
