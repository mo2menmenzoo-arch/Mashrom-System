import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEGP, formatDate, formatInt } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const hasQuery = query.length >= 2;

  const sales = hasQuery
    ? await prisma.sale.findMany({
        where: { customerName: { contains: query, mode: "insensitive" } },
        orderBy: { date: "desc" },
        take: 20,
        select: {
          id: true,
          date: true,
          customerName: true,
          cartons: true,
          total: true,
          paid: true,
          cycle: { select: { number: true } },
        },
      })
    : [];

  const expenses = hasQuery
    ? await prisma.expense.findMany({
        where: { description: { contains: query, mode: "insensitive" } },
        orderBy: { date: "desc" },
        take: 20,
        select: {
          id: true,
          date: true,
          description: true,
          amount: true,
          cycle: { select: { number: true } },
        },
      })
    : [];

  const withdrawals = hasQuery
    ? await prisma.custodyWithdrawal.findMany({
        where: { description: { contains: query, mode: "insensitive" } },
        orderBy: { date: "desc" },
        take: 20,
        select: {
          id: true,
          date: true,
          description: true,
          amount: true,
          cycle: { select: { number: true } },
        },
      })
    : [];

  const inventory = hasQuery
    ? await prisma.inventoryItem.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          unit: true,
          initialQty: true,
          createdAt: true,
          cycle: { select: { number: true } },
        },
      })
    : [];

  const totalResults =
    sales.length + expenses.length + withdrawals.length + inventory.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">البحث</h1>
        <p className="text-sm text-muted-foreground">
          بحث شامل في المبيعات والمصاريف والعهدة والمخزن
        </p>
      </div>

      {/* Search input */}
      <form method="GET" className="flex gap-2">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={query}
            placeholder="ابحث عن عميل، مصروف، صنف..."
            autoComplete="off"
            className="w-full rounded-md border bg-background py-2 pe-10 ps-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          بحث
        </button>
      </form>

      {!hasQuery && (
        <p className="text-sm text-muted-foreground">
          أدخل حرفين على الأقل للبحث.
        </p>
      )}

      {hasQuery && totalResults === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          لا نتائج لـ &quot;{query}&quot;.
        </p>
      )}

      {hasQuery && totalResults > 0 && (
        <p className="text-sm text-muted-foreground">
          {formatInt(totalResults)} نتيجة لـ &quot;{query}&quot;
        </p>
      )}

      {sales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              المبيعات ({formatInt(sales.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">العميل</th>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">الدورة</th>
                    <th className="py-2 font-medium">كراتين</th>
                    <th className="py-2 font-medium">الإجمالي</th>
                    <th className="py-2 font-medium">المدفوع</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b last:border-0 hover:bg-muted/40"
                    >
                      <td className="py-2 font-medium">{s.customerName}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {formatDate(s.date)}
                      </td>
                      <td className="py-2">
                        <Badge variant="secondary">
                          د{formatInt(s.cycle.number)}
                        </Badge>
                      </td>
                      <td className="py-2 tabular-nums">
                        {formatInt(s.cartons)}
                      </td>
                      <td className="py-2 tabular-nums text-success font-medium">
                        {formatEGP(Number(s.total))}
                      </td>
                      <td className="py-2 tabular-nums">
                        {formatEGP(Number(s.paid))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              المصاريف ({formatInt(expenses.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">الوصف</th>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">الدورة</th>
                    <th className="py-2 font-medium">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b last:border-0 hover:bg-muted/40"
                    >
                      <td className="py-2">{e.description}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {formatDate(e.date)}
                      </td>
                      <td className="py-2">
                        <Badge variant="secondary">
                          د{formatInt(e.cycle.number)}
                        </Badge>
                      </td>
                      <td className="py-2 tabular-nums text-destructive">
                        {formatEGP(Number(e.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {withdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              صرفيات العهدة ({formatInt(withdrawals.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">الوصف</th>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">الدورة</th>
                    <th className="py-2 font-medium">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr
                      key={w.id}
                      className="border-b last:border-0 hover:bg-muted/40"
                    >
                      <td className="py-2">{w.description}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {formatDate(w.date)}
                      </td>
                      <td className="py-2">
                        <Badge variant="secondary">
                          د{formatInt(w.cycle.number)}
                        </Badge>
                      </td>
                      <td className="py-2 tabular-nums text-warning">
                        {formatEGP(Number(w.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {inventory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              أصناف المخزن ({formatInt(inventory.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">الصنف</th>
                    <th className="py-2 font-medium">الدورة</th>
                    <th className="py-2 font-medium">الكمية الأولية</th>
                    <th className="py-2 font-medium">الوحدة</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-muted/40"
                    >
                      <td className="py-2 font-medium">{item.name}</td>
                      <td className="py-2">
                        <Badge variant="secondary">
                          د{formatInt(item.cycle.number)}
                        </Badge>
                      </td>
                      <td className="py-2 tabular-nums">
                        {Number(item.initialQty)}
                      </td>
                      <td className="py-2 text-muted-foreground">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
