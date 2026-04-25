import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEGP, formatDate } from "@/lib/format";
import { GreenhouseSettingsForm } from "./greenhouse-settings-form";
import { FoundingExpenseForm } from "./founding-expense-form";
import { FoundingExpenseRowActions } from "./founding-expense-row-actions";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GreenhouseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const canEdit = isAdmin || session?.user?.role === "ACCOUNTANT";

  const gh = await prisma.greenhouse.findUnique({
    where: { id },
    include: {
      settings: true,
      foundingExpenses: { orderBy: { date: "desc" } },
    },
  });

  if (!gh) notFound();

  const totalFounding = gh.foundingExpenses.reduce((s, fe) => s + Number(fe.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{gh.name}</h1>
          <p className="text-sm text-muted-foreground">صوبة رقم {gh.number}</p>
        </div>
      </div>

      {isAdmin && (
        <GreenhouseSettingsForm
          greenhouseId={gh.id}
          defaults={{
            temperature: gh.settings?.temperature ?? 22,
            humidity: gh.settings?.humidity ?? 85,
            cycleDuration: gh.settings?.cycleDuration ?? 60,
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            مصاريف التأسيس — إجمالي: {formatEGP(totalFounding)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && <FoundingExpenseForm greenhouseId={gh.id} />}

          {gh.foundingExpenses.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">لا توجد مصاريف تأسيس بعد.</p>
          ) : (
            <div className="space-y-2 mt-4">
              {gh.foundingExpenses.map((fe) => (
                <div
                  key={fe.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{fe.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(fe.date)}</p>
                    {fe.notes && <p className="text-xs text-muted-foreground">{fe.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums text-destructive">
                      {formatEGP(Number(fe.amount))}
                    </span>
                    {canEdit && !fe.custodyWithdrawalId && (
                      <FoundingExpenseRowActions
                        expense={{
                          id: fe.id,
                          date: fe.date.toISOString().slice(0, 10),
                          amount: Number(fe.amount),
                          description: fe.description,
                          notes: fe.notes,
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
