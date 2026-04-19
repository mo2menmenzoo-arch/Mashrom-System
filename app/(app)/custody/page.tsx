import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCustodyBalance, CUSTODY_LOW_THRESHOLD } from "@/lib/custody";
import { formatEGP, formatDate, formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DepositForm, WithdrawalForm } from "./custody-form";

export const dynamic = "force-dynamic";

export default async function CustodyPage() {
  const activeCycle = await prisma.cycle.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">العهدة</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد دورة إنتاج نشطة. أنشئ دورة أولاً من صفحة الدورات.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [balance, deposits, withdrawals] = await Promise.all([
    getCustodyBalance(),
    prisma.custodyDeposit.findMany({
      where: { cycleId: activeCycle.id },
      orderBy: { date: "desc" },
    }),
    prisma.custodyWithdrawal.findMany({
      where: { cycleId: activeCycle.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const isLow = balance < CUSTODY_LOW_THRESHOLD;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">العهدة</h1>
          <p className="text-sm text-muted-foreground">دورة {formatInt(activeCycle.number)}</p>
        </div>
        <Card className={cn("border-2", isLow ? "border-warning" : "border-success")}>
          <CardContent className="flex items-center gap-3 p-4">
            <Wallet className={cn("h-6 w-6", isLow ? "text-warning" : "text-success")} />
            <div>
              <p className="text-xs text-muted-foreground">الرصيد الإجمالي</p>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums",
                  isLow ? "text-warning" : "text-success",
                )}
              >
                {formatEGP(balance)}
              </p>
            </div>
            {isLow && (
              <Badge variant="warning" className="mr-2 text-xs">
                رصيد منخفض
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-success">
              <ArrowDownCircle className="h-4 w-4" />
              إيداع في العهدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DepositForm cycleId={activeCycle.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <ArrowUpCircle className="h-4 w-4" />
              صرف من العهدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WithdrawalForm cycleId={activeCycle.id} balance={balance} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownCircle className="h-4 w-4 text-success" />
              الإيداعات ({formatInt(deposits.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deposits.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد إيداعات.</p>
            ) : (
              <div className="space-y-2">
                {deposits.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="tabular-nums text-muted-foreground text-xs">
                        {formatDate(d.date)}
                      </p>
                      {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                    </div>
                    <span className="font-medium tabular-nums text-success">
                      +{formatEGP(Number(d.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpCircle className="h-4 w-4 text-destructive" />
              الصرفيات ({formatInt(withdrawals.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد صرفيات.</p>
            ) : (
              <div className="space-y-2">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="tabular-nums text-muted-foreground text-xs">
                        {formatDate(w.date)}
                      </p>
                      <p className="text-xs">{w.description}</p>
                    </div>
                    <span className="font-medium tabular-nums text-destructive">
                      -{formatEGP(Number(w.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
