import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { getCyclePnL } from "@/lib/reports";
import { cycleDayNumber, cycleProgress, CYCLE_LENGTH_DAYS } from "@/lib/cycle";
import { formatDate, formatEGP, formatInt } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "نشطة",
  SCHEDULED: "مجدولة",
  ENDED: "منتهية",
};

export default async function CycleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cycle = await prisma.cycle.findUnique({ where: { id } });
  if (!cycle) notFound();

  const pnl = await getCyclePnL(cycle.id);
  const day = cycleDayNumber(cycle.startDate);
  const pct = cycleProgress(cycle.startDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/cycles" className="text-sm text-primary hover:underline">
            ← العودة إلى الدورات
          </Link>
          <h1 className="mt-2 text-2xl font-bold">دورة {formatInt(cycle.number)}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
          </p>
        </div>
        <Badge>{STATUS_LABEL[cycle.status]}</Badge>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>اليوم {formatInt(day)} من {formatInt(CYCLE_LENGTH_DAYS)}</span>
            <span className="tabular-nums">{pct}٪</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">الإيرادات</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-success tabular-nums">{formatEGP(pnl.revenue)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">المصاريف</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-destructive tabular-nums">{formatEGP(pnl.expenses)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">العهدة</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-warning tabular-nums">{formatEGP(pnl.custody)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{pnl.net >= 0 ? "صافي الربح" : "صافي الخسارة"}</CardTitle></CardHeader><CardContent><p className={`text-xl font-bold tabular-nums ${pnl.net >= 0 ? "text-success" : "text-destructive"}`}>{formatEGP(Math.abs(pnl.net))}</p></CardContent></Card>
      </div>

      {cycle.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">ملاحظات</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{cycle.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
