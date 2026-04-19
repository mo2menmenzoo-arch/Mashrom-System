import { addDays } from "date-fns";
import { AlertTriangle, Clock, Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCycleBalances } from "@/lib/inventory";
import { formatDate, formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  DIRECT_PURCHASE: "شراء مباشر",
  OPERATING_EXPENSE: "مصروف تشغيل",
};

export default async function InventoryPage() {
  const activeCycle = await prisma.cycle.findFirst({
    where: { status: { in: ["ACTIVE", "ENDED"] } },
    orderBy: { number: "desc" },
  });

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">المخزن</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد دورات بعد. أنشئ دورة أولاً من صفحة الدورات.
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = await prisma.inventoryItem.findMany({
    where: { cycleId: activeCycle.id },
    orderBy: { createdAt: "asc" },
  });

  const balances = await getCycleBalances(activeCycle.id);

  const now = new Date();
  const weekOut = addDays(now, 7);

  const enriched = items.map((item) => {
    const balance = Number(balances.get(item.id) ?? 0);
    const isExpired = item.expiryDate ? item.expiryDate < now : false;
    const isExpiringSoon = item.expiryDate && !isExpired ? item.expiryDate <= weekOut : false;
    const isLowStock = item.lowStockAt !== null && balance <= Number(item.lowStockAt);
    return { ...item, balance, isExpired, isExpiringSoon, isLowStock };
  });

  const alertCount = enriched.filter((i) => i.isExpired || i.isExpiringSoon || i.isLowStock).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المخزن</h1>
          <p className="text-sm text-muted-foreground">دورة {formatInt(activeCycle.number)}</p>
        </div>
        {alertCount > 0 && (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {formatInt(alertCount)} تنبيه
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            الأصناف ({formatInt(items.length)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enriched.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد أصناف في المخزن. أضف مصاريف شراء مستلزمات لتظهر هنا.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">الصنف</th>
                    <th className="py-2 font-medium">الرصيد الحالي</th>
                    <th className="py-2 font-medium">الوحدة</th>
                    <th className="py-2 font-medium">المصدر</th>
                    <th className="py-2 font-medium">تاريخ الانتهاء</th>
                    <th className="py-2 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(
                        "border-b last:border-0 hover:bg-muted/40",
                        item.isExpired && "bg-destructive/5",
                      )}
                    >
                      <td className="py-3 font-medium">{item.name}</td>
                      <td
                        className={cn(
                          "py-3 tabular-nums font-medium",
                          item.isLowStock && "text-warning",
                          item.balance <= 0 && "text-destructive",
                        )}
                      >
                        {item.balance.toFixed(2)}
                      </td>
                      <td className="py-3 text-muted-foreground">{item.unit}</td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-xs">
                          {SOURCE_LABEL[item.source] ?? item.source}
                        </Badge>
                      </td>
                      <td className="py-3 tabular-nums">
                        {item.expiryDate ? (
                          <span
                            className={cn(
                              item.isExpired && "text-destructive font-medium",
                              item.isExpiringSoon && "text-warning font-medium",
                            )}
                          >
                            {formatDate(item.expiryDate)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.isExpired && (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              منتهي الصلاحية
                            </Badge>
                          )}
                          {item.isExpiringSoon && !item.isExpired && (
                            <Badge variant="warning" className="gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              ينتهي قريباً
                            </Badge>
                          )}
                          {item.isLowStock && (
                            <Badge variant="warning" className="gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              كمية منخفضة
                            </Badge>
                          )}
                          {!item.isExpired && !item.isExpiringSoon && !item.isLowStock && (
                            <Badge variant="secondary" className="text-xs">
                              جيد
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
