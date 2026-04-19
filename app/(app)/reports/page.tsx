import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  BarChart2,
  AlertTriangle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getAllCyclesPnL } from "@/lib/reports";
import { getCustodyBalance, CUSTODY_LOW_THRESHOLD } from "@/lib/custody";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEGP, formatDate, formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CyclesPnLChart, CycleBreakdownChart } from "./reports-charts";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "نشطة",
  SCHEDULED: "مجدولة",
  ENDED: "منتهية",
};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "outline"> = {
  ACTIVE: "success",
  SCHEDULED: "secondary",
  ENDED: "outline",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const { cycle: selectedCycleId } = await searchParams;

  const [cycles, allPnL, custodyBalance] = await Promise.all([
    prisma.cycle.findMany({
      orderBy: { number: "asc" },
      select: { id: true, number: true, startDate: true, endDate: true, status: true },
    }),
    getAllCyclesPnL(),
    getCustodyBalance(),
  ]);

  const pnlById = Object.fromEntries(allPnL.map((p) => [p.cycleId, p]));

  const totalRevenue = allPnL.reduce((s, p) => s + p.revenue, 0);
  const totalExpenses = allPnL.reduce((s, p) => s + p.expenses + p.custody, 0);

  const selectedPnL = selectedCycleId ? pnlById[selectedCycleId] : null;
  const selectedCycle = selectedCycleId
    ? cycles.find((c) => c.id === selectedCycleId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">التقارير المالية</h1>
        <p className="text-sm text-muted-foreground">
          ملخص الأرباح والخسائر عبر جميع الدورات
        </p>
      </div>

      {/* Global KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="إجمالي المبيعات"
          value={formatEGP(totalRevenue)}
          accent="success"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          label="إجمالي المصاريف"
          value={formatEGP(totalExpenses)}
          accent="destructive"
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <KpiCard
          label="رصيد العهدة الحالي"
          value={formatEGP(custodyBalance)}
          accent={custodyBalance < CUSTODY_LOW_THRESHOLD ? "warning" : "success"}
          icon={<CircleDollarSign className="h-5 w-5" />}
          badge={
            custodyBalance < CUSTODY_LOW_THRESHOLD ? (
              <span className="flex items-center gap-1 text-xs text-warning">
                <AlertTriangle className="h-3 w-3" />
                رصيد منخفض
              </span>
            ) : null
          }
        />
      </div>

      {/* Bar chart */}
      {allPnL.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4" />
              مقارنة الدورات
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <CyclesPnLChart cycles={allPnL} />
          </CardContent>
        </Card>
      )}

      {/* All-cycles summary table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            ملخص الدورات ({formatInt(cycles.length)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد دورات بعد.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">الدورة</th>
                    <th className="py-2 font-medium">الفترة</th>
                    <th className="py-2 font-medium">الحالة</th>
                    <th className="py-2 font-medium">الإيرادات</th>
                    <th className="py-2 font-medium">المصاريف</th>
                    <th className="py-2 font-medium">العهدة</th>
                    <th className="py-2 font-medium">صافي الربح</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((c) => {
                    const pnl = pnlById[c.id];
                    const isSelected = c.id === selectedCycleId;
                    const isProfit = (pnl?.net ?? 0) >= 0;
                    return (
                      <tr
                        key={c.id}
                        className={cn(
                          "border-b last:border-0 hover:bg-muted/40",
                          isSelected && "bg-muted/60",
                        )}
                      >
                        <td className="py-3 font-medium">
                          دورة {formatInt(c.number)}
                        </td>
                        <td className="py-3 tabular-nums text-xs text-muted-foreground">
                          {formatDate(c.startDate)} — {formatDate(c.endDate)}
                        </td>
                        <td className="py-3">
                          <Badge variant={STATUS_VARIANT[c.status] ?? "outline"}>
                            {STATUS_LABEL[c.status] ?? c.status}
                          </Badge>
                        </td>
                        <td className="py-3 tabular-nums text-success font-medium">
                          {pnl ? formatEGP(pnl.revenue) : "—"}
                        </td>
                        <td className="py-3 tabular-nums text-destructive">
                          {pnl ? formatEGP(pnl.expenses) : "—"}
                        </td>
                        <td className="py-3 tabular-nums text-warning">
                          {pnl ? formatEGP(pnl.custody) : "—"}
                        </td>
                        <td
                          className={cn(
                            "py-3 tabular-nums font-bold",
                            isProfit ? "text-success" : "text-destructive",
                          )}
                        >
                          {pnl ? formatEGP(pnl.net) : "—"}
                        </td>
                        <td className="py-3 text-left">
                          <Link
                            href={`/reports?cycle=${c.id}`}
                            className={cn(
                              "text-sm hover:underline",
                              isSelected
                                ? "font-medium text-foreground"
                                : "text-primary",
                            )}
                          >
                            {isSelected ? "محدد ✓" : "تفاصيل ←"}
                          </Link>
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

      {/* Selected cycle detail */}
      {selectedPnL && selectedCycle && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                تفاصيل دورة {formatInt(selectedCycle.number)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatDate(selectedCycle.startDate)} —{" "}
                {formatDate(selectedCycle.endDate)}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[selectedCycle.status] ?? "outline"}>
              {STATUS_LABEL[selectedCycle.status] ?? selectedCycle.status}
            </Badge>
          </div>

          {/* Detail KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="الإيرادات"
              value={formatEGP(selectedPnL.revenue)}
              sublabel={`${formatInt(selectedPnL.cartonsSold)} كرتونة`}
              accent="success"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <KpiCard
              label="مصاريف التشغيل"
              value={formatEGP(selectedPnL.expenses)}
              accent="destructive"
              icon={<TrendingDown className="h-5 w-5" />}
            />
            <KpiCard
              label="مصاريف العهدة"
              value={formatEGP(selectedPnL.custody)}
              accent="warning"
              icon={<CircleDollarSign className="h-5 w-5" />}
            />
            <KpiCard
              label={selectedPnL.net >= 0 ? "صافي الربح" : "صافي الخسارة"}
              value={formatEGP(Math.abs(selectedPnL.net))}
              sublabel={
                selectedPnL.totalUnpaid > 0
                  ? `غير مدفوع: ${formatEGP(selectedPnL.totalUnpaid)}`
                  : undefined
              }
              accent={selectedPnL.net >= 0 ? "success" : "destructive"}
              icon={
                selectedPnL.net >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )
              }
            />
          </div>

          {/* Breakdown donut chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">توزيع الإيرادات</CardTitle>
            </CardHeader>
            <CardContent>
              <CycleBreakdownChart pnl={selectedPnL} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── KpiCard ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sublabel,
  accent,
  icon,
  badge,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent: "success" | "destructive" | "warning" | "default";
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const accentColor = {
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
    default: "text-foreground",
  }[accent];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <span className={accentColor}>{icon}</span>
        </div>
        <p className={cn("mt-2 text-2xl font-bold tabular-nums", accentColor)}>
          {value}
        </p>
        {sublabel && (
          <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
        )}
        {badge && <div className="mt-1">{badge}</div>}
      </CardContent>
    </Card>
  );
}
