import { withMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return Response.json({ sales: [], expenses: [], withdrawals: [], inventory: [] });
  const [sales, expenses, withdrawals, inventory] = await Promise.all([
    prisma.sale.findMany({ where: { customerName: { contains: q, mode: "insensitive" } }, orderBy: { date: "desc" }, take: 20, select: { id: true, date: true, customerName: true, cartons: true, total: true, paid: true, cycle: { select: { number: true } } } }),
    prisma.expense.findMany({ where: { description: { contains: q, mode: "insensitive" } }, orderBy: { date: "desc" }, take: 20, select: { id: true, date: true, description: true, amount: true, cycle: { select: { number: true } } } }),
    prisma.custodyWithdrawal.findMany({ where: { description: { contains: q, mode: "insensitive" } }, orderBy: { date: "desc" }, take: 20, select: { id: true, date: true, description: true, amount: true, cycle: { select: { number: true } } } }),
    prisma.inventoryItem.findMany({ where: { name: { contains: q, mode: "insensitive" } }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, name: true, unit: true, initialQty: true, createdAt: true, cycle: { select: { number: true } } } }),
  ]);
  return Response.json({ sales, expenses, withdrawals, inventory });
});
