import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type InventoryBalance = {
  itemId: string;
  balance: Prisma.Decimal;
};

/** Aggregate current balance for one inventory item. */
export async function getItemBalance(itemId: string): Promise<Prisma.Decimal> {
  const agg = await prisma.inventoryTxn.aggregate({
    where: { itemId },
    _sum: { qty: true },
  });
  return agg._sum.qty ?? new Prisma.Decimal(0);
}

/** Aggregate balances for all items in a cycle, keyed by itemId. */
export async function getCycleBalances(cycleId: string): Promise<Map<string, Prisma.Decimal>> {
  const rows = await prisma.inventoryTxn.groupBy({
    by: ["itemId"],
    _sum: { qty: true },
    where: { item: { cycleId } },
  });
  const map = new Map<string, Prisma.Decimal>();
  for (const r of rows) {
    map.set(r.itemId, r._sum.qty ?? new Prisma.Decimal(0));
  }
  return map;
}
