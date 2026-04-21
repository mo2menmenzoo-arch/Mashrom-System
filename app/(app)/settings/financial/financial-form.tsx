"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionToast } from "@/components/ui/action-toast";
import { DollarSign } from "lucide-react";
import { updateFinancialSettingsAction } from "@/actions/settings";

type Props = {
  defaults: { currency: string; taxRate: number };
};

export function FinancialForm({ defaults }: Props) {
  const [state, action, pending] = useActionState(updateFinancialSettingsAction, undefined);

  const toast = state
    ? { msg: state.success ? "تم الحفظ بنجاح" : state.error, ok: state.success }
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <DollarSign className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="text-base">الإعدادات المالية الافتراضية</CardTitle>
          <CardDescription>تُستخدم كقيم مرجعية في تقارير النظام</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="currency">العملة الافتراضية</Label>
              <select
                id="currency"
                name="currency"
                defaultValue={defaults.currency}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxRate">نسبة الضريبة (%)</Label>
              <Input
                id="taxRate"
                name="taxRate"
                type="number"
                min={0}
                max={100}
                step={0.1}
                defaultValue={defaults.taxRate}
              />
            </div>
          </div>
          <ActionToast toast={toast} />
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
