import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCycleCustodySpend } from "@/lib/custody";

export type CyclePnL = {
  cycleId: string;
  cycleNumber: number;
  greenhouseId: string;
  revenue: number;
  expenses: number;
  custody: number;
  net: number;
  cartonsSold: number;
  totalPaid: number;
  totalUnpaid: number;
};

export type GreenhousePnL = {
  greenhouseId: string;
  greenhouseName: string;
  greenhouseNumber: number;
  revenue: number;
  expenses: number;
  custody: number;
  net: number;
  foundingTotal: number;
  cycles: CyclePnL[];
};

export async function getCyclePnL(cycleId: string): Promise<CyclePnL> {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    select: { id: true, number: true, greenhouseId: true },
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
    greenhouseId: cycle.greenhouseId,
    revenue,
    expenses,
    custody,
    net,
    cartonsSold,
    totalPaid: paid,
    totalUnpaid: Number((revenue - paid).toFixed(2)),
  };
}

export async function getAllCyclesPnL(greenhouseId?: string): Promise<CyclePnL[]> {
  const cycles = await prisma.cycle.findMany({
    where: greenhouseId ? { greenhouseId } : undefined,
    orderBy: { number: "asc" },
    select: { id: true, number: true, greenhouseId: true },
  });
  return Promise.all(cycles.map((c) => getCyclePnL(c.id)));
}

export async function getGreenhousePnL(greenhouseId: string): Promise<GreenhousePnL> {
  const gh = await prisma.greenhouse.findUnique({
    where: { id: greenhouseId },
    include: {
      foundingExpenses: { select: { amount: true } },
    },
  });
  if (!gh) throw new Error("Greenhouse not found");

  const cycles = await getAllCyclesPnL(greenhouseId);
  const foundingTotal = gh.foundingExpenses.reduce((s, fe) => s + Number(fe.amount), 0);

  return {
    greenhouseId: gh.id,
    greenhouseName: gh.name,
    greenhouseNumber: gh.number,
    revenue: cycles.reduce((s, c) => s + c.revenue, 0),
    expenses: cycles.reduce((s, c) => s + c.expenses, 0),
    custody: cycles.reduce((s, c) => s + c.custody, 0),
    net: cycles.reduce((s, c) => s + c.net, 0),
    foundingTotal,
    cycles,
  };
}

export async function getAllGreenhousesPnL(): Promise<GreenhousePnL[]> {
  const greenhouses = await prisma.greenhouse.findMany({
    where: { organizationId: "default-org" },
    orderBy: { number: "asc" },
    select: { id: true },
  });
  return Promise.all(greenhouses.map((g) => getGreenhousePnL(g.id)));
}
