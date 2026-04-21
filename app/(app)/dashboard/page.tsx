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
      <Card className="shadow-card">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">تقدّم الدورة</span>
            <div className="text-left">
              <span className="text-2xl font-bold tabular-nums text-primary">{c.progressPct}</span>
              <span className="text-sm text-muted-foreground">٪</span>
            </div>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-l from-primary to-primary/70 transition-all"
              style={{ width: `${c.progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>بداية</span>
            <span>منتصف</span>
            <span>نهاية</span>
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
                  "flex items-center justify-between rounded-md border border-r-4 p-3 text-sm transition-all hover:bg-accent hover:translate-x-0.5",
                  a.level === "destructive" && "border-r-destructive border-destructive/20 bg-destructive/5",
                  a.level === "warning" && "border-r-warning border-warning/20 bg-warning/5",
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
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">إضافة سريعة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href="/expenses">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <TrendingDown className="h-5 w-5" />
              </span>
              <span className="text-xs">مصروف جديد</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href="/sales">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <TrendingUp className="h-5 w-5" />
              </span>
              <span className="text-xs">بيع جديد</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href="/custody">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <CircleDollarSign className="h-5 w-5" />
              </span>
              <span className="text-xs">صرف عهدة</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href="/operations">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-xs">قراءة اليوم</span>
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
  const styles = {
    success: {
      bar: "border-t-success",
      iconBg: "bg-success/10 text-success",
      value: "text-success",
    },
    destructive: {
      bar: "border-t-destructive",
      iconBg: "bg-destructive/10 text-destructive",
      value: "text-destructive",
    },
    warning: {
      bar: "border-t-warning",
      iconBg: "bg-warning/10 text-warning",
      value: "text-warning",
    },
    default: {
      bar: "border-t-border",
      iconBg: "bg-muted text-muted-foreground",
      value: "text-foreground",
    },
  }[accent];

  return (
    <Card className={`shadow-card hover:shadow-card-hover border-t-2 transition-shadow ${styles.bar}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon && (
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.iconBg}`}>
              {icon}
            </span>
          )}
        </div>
        <p className={`mt-3 text-2xl font-bold tabular-nums ${styles.value}`}>{value}</p>
        {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
