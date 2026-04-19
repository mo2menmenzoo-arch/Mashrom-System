import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEGP, formatDate, formatInt } from "@/lib/format";
import { getCycleBalances } from "@/lib/inventory";
import { SaleForm } from "./sale-form";
import { PaymentForm } from "./payment-form";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const activeCycle = await prisma.cycle.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">المبيعات</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد دورة إنتاج نشطة. أنشئ دورة أولاً من صفحة الدورات.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [sales, inventoryItems] = await Promise.all([
    prisma.sale.findMany({
      where: { cycleId: activeCycle.id },
      orderBy: { date: "desc" },
    }),
    prisma.inventoryItem.findMany({
      where: { cycleId: activeCycle.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const balances = await getCycleBalances(activeCycle.id);

  const inventoryOptions = inventoryItems.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    balance: Number(balances.get(item.id) ?? 0),
  }));

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalPaid = sales.reduce((sum, s) => sum + Number(s.paid), 0);
  const totalUnpaid = totalRevenue - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المبيعات</h1>
          <p className="text-sm text-muted-foreground">دورة {formatInt(activeCycle.number)}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="rounded-md border bg-card px-3 py-2">
            الإيرادات:{" "}
            <span className="font-bold tabular-nums text-success">{formatEGP(totalRevenue)}</span>
          </div>
          {totalUnpaid > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2">
              غير مدفوع:{" "}
              <span className="font-bold tabular-nums text-warning">
                {formatEGP(totalUnpaid)}
              </span>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            بيع جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SaleForm cycleId={activeCycle.id} inventoryItems={inventoryOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">قائمة المبيعات ({formatInt(sales.length)})</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد مبيعات مسجلة لهذه الدورة بعد.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">العميل</th>
                    <th className="py-2 font-medium">الكراتين</th>
                    <th className="py-2 font-medium">سعر الكرتونة</th>
                    <th className="py-2 font-medium">الإجمالي</th>
                    <th className="py-2 font-medium">المدفوع</th>
                    <th className="py-2 font-medium">المتبقي</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => {
                    const remaining = Number(s.total) - Number(s.paid);
                    const isPaid = remaining <= 0;
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-3 tabular-nums">{formatDate(s.date)}</td>
                        <td className="py-3 font-medium">{s.customerName}</td>
                        <td className="py-3 tabular-nums">{formatInt(s.cartons)}</td>
                        <td className="py-3 tabular-nums">{formatEGP(Number(s.pricePerCarton))}</td>
                        <td className="py-3 tabular-nums font-medium text-success">
                          {formatEGP(Number(s.total))}
                        </td>
                        <td className="py-3 tabular-nums">{formatEGP(Number(s.paid))}</td>
                        <td className="py-3 tabular-nums">
                          {isPaid ? (
                            <Badge variant="success" className="text-xs">
                              مدفوع
                            </Badge>
                          ) : (
                            <span className="font-medium text-warning tabular-nums">
                              {formatEGP(remaining)}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {!isPaid && (
                            <PaymentForm saleId={s.id} remaining={remaining} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
