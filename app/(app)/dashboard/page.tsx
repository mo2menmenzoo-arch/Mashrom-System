import Link from "next/link";
import { AlertTriangle, CircleDollarSign, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getDashboardData, CYCLE_LENGTH_DAYS } from "@/lib/dashboard";
import { formatEGP, formatDate, formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data.activeCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">الرئيسية</h1>
        <Card>
          <CardHeader>
            <CardTitle>مرحباً بك في نظام إدارة صوبة الماشروم 🍄</CardTitle>
            <CardDescription>
              لا توجد دورة إنتاج نشطة حالياً. ابدأ بإنشاء دورتك الأولى.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/cycles">
                <Plus className="h-4 w-4" />
                إنشاء دورة جديدة
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { activeCycle: c, alerts } = data;
  const profit = c.pnl.net;
  const isProfit = profit >= 0;

  return (
    <div className="space-y-6">
      {/* Cycle Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الرئيسية</h1>
          <p className="text-sm text-muted-foreground">
            دورة {formatInt(c.number)} · {formatDate(c.startDate)} —{" "}
            {formatDate(c.endDate)}
          </p>
        </div>
        <Badge variant="outline" className="tabular-nums text-base">
          اليوم {formatInt(c.dayNumber)} من {formatInt(CYCLE_LENGTH_DAYS)}
        </Badge>
      </div>

      {/* Cycle progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>تقدّم الدورة</span>
            <span className="tabular-nums">{c.progressPct}٪</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${c.progressPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="الإيرادات"
          value={formatEGP(c.pnl.revenue)}
          sublabel={`${formatInt(c.pnl.cartonsSold)} كرتونة مباعة`}
          accent="success"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          label="مصاريف التشغيل"
          value={formatEGP(c.pnl.expenses)}
          accent="destructive"
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <KpiCard
          label="مصاريف العهدة"
          value={formatEGP(c.pnl.custody)}
          accent="warning"
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
        <KpiCard
          label={isProfit ? "صافي الربح" : "صافي الخسارة"}
          value={formatEGP(Math.abs(profit))}
          accent={isProfit ? "success" : "destructive"}
          icon={isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" />
              تنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a) => (
              <Link
                key={a.id}
                href={a.href ?? "#"}
                className={cn(
                  "flex items-center justify-between rounded-md border p-3 text-sm transition-colors hover:bg-accent",
                  a.level === "destructive" && "border-destructive/30 bg-destructive/5",
                  a.level === "warning" && "border-warning/40 bg-warning/5",
                )}
              >
                <span>{a.message}</span>
                <span className="text-xs text-muted-foreground">عرض ←</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Add */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">إضافة سريعة</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/expenses">
              <Plus className="h-4 w-4" />
              مصروف جديد
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/sales">
              <Plus className="h-4 w-4" />
              بيع جديد
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/custody">
              <Plus className="h-4 w-4" />
              صرف عهدة
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/operations">
              <Plus className="h-4 w-4" />
              قراءة اليوم
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent: "success" | "destructive" | "warning" | "default";
  icon?: React.ReactNode;
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
        <p className={cn("mt-2 text-2xl font-bold tabular-nums", accentColor)}>{value}</p>
        {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
