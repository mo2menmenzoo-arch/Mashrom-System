import { Plus, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReadingForm } from "./reading-form";

export const dynamic = "force-dynamic";

const CLEANLINESS_LABEL: Record<string, string> = {
  EXCELLENT: "ممتاز",
  GOOD: "جيد",
  ACCEPTABLE: "مقبول",
  POOR: "سيء",
};

const CLEANLINESS_VARIANT: Record<
  string,
  "success" | "secondary" | "warning" | "destructive"
> = {
  EXCELLENT: "success",
  GOOD: "secondary",
  ACCEPTABLE: "warning",
  POOR: "destructive",
};

// Safe ranges for mushroom growing
const TEMP_MIN = 16;
const TEMP_MAX = 28;
const HUMIDITY_MIN = 80;
const HUMIDITY_MAX = 95;
const CO2_MAX = 2000;

function isTempAlert(v: number | null) {
  if (v === null) return false;
  return v < TEMP_MIN || v > TEMP_MAX;
}
function isHumidityAlert(v: number | null) {
  if (v === null) return false;
  return v < HUMIDITY_MIN || v > HUMIDITY_MAX;
}
function isCo2Alert(v: number | null) {
  if (v === null) return false;
  return v > CO2_MAX;
}

export default async function OperationsPage() {
  const activeCycle = await prisma.cycle.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">جدول التشغيل</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد دورة إنتاج نشطة. أنشئ دورة أولاً من صفحة الدورات.
          </CardContent>
        </Card>
      </div>
    );
  }

  const readings = await prisma.operationReading.findMany({
    where: { cycleId: activeCycle.id },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">جدول التشغيل</h1>
          <p className="text-sm text-muted-foreground">دورة {formatInt(activeCycle.number)}</p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1 text-left">
          <p>نطاق آمن: حرارة {TEMP_MIN}–{TEMP_MAX}°م · رطوبة {HUMIDITY_MIN}–{HUMIDITY_MAX}٪ · CO₂ &lt;{CO2_MAX}ppm</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            تسجيل قراءة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReadingForm cycleId={activeCycle.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            سجل القراءات ({formatInt(readings.length)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد قراءات مسجلة بعد.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">اليوم</th>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">الحرارة (°م)</th>
                    <th className="py-2 font-medium">الرطوبة (%)</th>
                    <th className="py-2 font-medium">CO₂ (ppm)</th>
                    <th className="py-2 font-medium">النظافة</th>
                    <th className="py-2 font-medium">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => {
                    const tempAlert = isTempAlert(r.temperature ? Number(r.temperature) : null);
                    const humidAlert = isHumidityAlert(r.humidity ? Number(r.humidity) : null);
                    const co2Alert = isCo2Alert(r.co2);
                    const hasAlert = tempAlert || humidAlert || co2Alert;
                    return (
                      <tr
                        key={r.id}
                        className={cn(
                          "border-b last:border-0 hover:bg-muted/40",
                          hasAlert && "bg-warning/5",
                        )}
                      >
                        <td className="py-3 tabular-nums font-medium">
                          <span className="flex items-center gap-1">
                            {hasAlert && (
                              <AlertTriangle className="h-3 w-3 text-warning" />
                            )}
                            {formatInt(r.dayNumber)}
                          </span>
                        </td>
                        <td className="py-3 tabular-nums">{formatDate(r.date)}</td>
                        <td
                          className={cn(
                            "py-3 tabular-nums",
                            tempAlert && "font-medium text-warning",
                          )}
                        >
                          {r.temperature !== null ? Number(r.temperature).toFixed(1) : "—"}
                        </td>
                        <td
                          className={cn(
                            "py-3 tabular-nums",
                            humidAlert && "font-medium text-warning",
                          )}
                        >
                          {r.humidity !== null ? Number(r.humidity).toFixed(1) : "—"}
                        </td>
                        <td
                          className={cn(
                            "py-3 tabular-nums",
                            co2Alert && "font-medium text-warning",
                          )}
                        >
                          {r.co2 !== null ? formatInt(r.co2) : "—"}
                        </td>
                        <td className="py-3">
                          {r.cleanliness ? (
                            <Badge
                              variant={CLEANLINESS_VARIANT[r.cleanliness] ?? "secondary"}
                              className="text-xs"
                            >
                              {CLEANLINESS_LABEL[r.cleanliness] ?? r.cleanliness}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 max-w-xs truncate text-muted-foreground">
                          {r.notes ?? "—"}
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
