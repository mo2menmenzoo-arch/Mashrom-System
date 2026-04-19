import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatInt } from "@/lib/format";
import { CreateCycleForm } from "./create-cycle-form";
import { CycleActions } from "./cycle-actions";

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

export default async function CyclesPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const cycles = await prisma.cycle.findMany({
    orderBy: { number: "desc" },
    include: {
      _count: {
        select: {
          sales: true,
          expenses: true,
          readings: true,
          deposits: true,
          withdrawals: true,
          inventory: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الدورات</h1>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              دورة جديدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateCycleForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            قائمة الدورات ({formatInt(cycles.length)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد دورات بعد. ابدأ بإنشاء الدورة الأولى.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">رقم الدورة</th>
                    <th className="py-2 font-medium">تاريخ البداية</th>
                    <th className="py-2 font-medium">تاريخ النهاية</th>
                    <th className="py-2 font-medium">الحالة</th>
                    <th className="py-2 font-medium">المبيعات</th>
                    <th className="py-2 font-medium">المصاريف</th>
                    <th className="py-2 font-medium">القراءات</th>
                    <th className="py-2 font-medium">{isAdmin ? "إجراءات" : ""}</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-3 font-medium">دورة {formatInt(c.number)}</td>
                      <td className="py-3 tabular-nums">{formatDate(c.startDate)}</td>
                      <td className="py-3 tabular-nums">{formatDate(c.endDate)}</td>
                      <td className="py-3">
                        <Badge variant={STATUS_VARIANT[c.status] ?? "outline"}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </Badge>
                      </td>
                      <td className="py-3 tabular-nums">{formatInt(c._count.sales)}</td>
                      <td className="py-3 tabular-nums">{formatInt(c._count.expenses)}</td>
                      <td className="py-3 tabular-nums">{formatInt(c._count.readings)}</td>
                      <td className="py-3 text-left">
                        <Link
                          href={`/cycles/${c.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          تفاصيل ←
                        </Link>
                      </td>
                      {isAdmin && (
                        <td className="py-3">
                          <CycleActions
                            cycleId={c.id}
                            status={c.status}
                            hasData={
                              c._count.sales +
                                c._count.expenses +
                                c._count.readings +
                                c._count.deposits +
                                c._count.withdrawals +
                                c._count.inventory >
                              0
                            }
                          />
                        </td>
                      )}
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
