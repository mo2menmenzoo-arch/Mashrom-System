import { Plus, PackageCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEGP, formatDate, formatInt } from "@/lib/format";
import { ExpenseForm } from "./expense-form";
import { ExpenseRowActions } from "./expense-row-actions";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await auth();
  const role = session?.user?.role;
  const canEdit = role === "ADMIN" || role === "OPERATOR";

  const activeCycle = await prisma.cycle.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">مصاريف التشغيل</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد دورة إنتاج نشطة. أنشئ دورة أولاً من صفحة الدورات.
          </CardContent>
        </Card>
      </div>
    );
  }

  const expenses = await prisma.expense.findMany({
    where: { cycleId: activeCycle.id },
    orderBy: { date: "desc" },
    include: { inventoryItem: true },
  });

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">مصاريف التشغيل</h1>
          <p className="text-sm text-muted-foreground">دورة {formatInt(activeCycle.number)}</p>
        </div>
        <div className="rounded-md border bg-card px-4 py-2 text-sm">
          الإجمالي:{" "}
          <span className="font-bold tabular-nums text-destructive">{formatEGP(total)}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            مصروف جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm cycleId={activeCycle.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            قائمة المصاريف ({formatInt(expenses.length)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد مصاريف مسجلة لهذه الدورة بعد.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">الوصف</th>
                    <th className="py-2 font-medium">المبلغ</th>
                    <th className="py-2 font-medium">مخزن</th>
                    {canEdit && <th className="py-2 font-medium">إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-3 tabular-nums">{formatDate(e.date)}</td>
                      <td className="py-3">{e.description}</td>
                      <td className="py-3 tabular-nums text-destructive font-medium">
                        {formatEGP(Number(e.amount))}
                      </td>
                      <td className="py-3">
                        {e.inventoryItem ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <PackageCheck className="h-3 w-3" />
                            {e.inventoryItem.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="py-3">
                          <ExpenseRowActions
                            expense={{
                              id: e.id,
                              date: e.date.toISOString().slice(0, 10),
                              description: e.description,
                              amount: Number(e.amount),
                              hasInventory: !!e.inventoryItem,
                            }}
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
