"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionToast } from "@/components/ui/action-toast";
import { Leaf } from "lucide-react";
import { updateGreenhouseSettingsAction } from "@/actions/greenhouse";

type Props = {
  greenhouseId: string;
  defaults: { temperature: number; humidity: number; cycleDuration: number };
};

export function GreenhouseSettingsForm({ greenhouseId, defaults }: Props) {
  const [state, action, pending] = useActionState(updateGreenhouseSettingsAction, undefined);

  const toast = state
    ? { msg: state.success ? "تم الحفظ بنجاح" : state.error, ok: state.success }
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <Leaf className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="text-base">إعدادات الصوبة</CardTitle>
          <CardDescription>درجة الحرارة والرطوبة المستهدفة ومدة الدورة</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="greenhouseId" value={greenhouseId} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="temperature">درجة الحرارة (°م)</Label>
              <Input id="temperature" name="temperature" type="number" min={0} max={50} defaultValue={defaults.temperature} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="humidity">الرطوبة (%)</Label>
              <Input id="humidity" name="humidity" type="number" min={0} max={100} defaultValue={defaults.humidity} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycleDuration">مدة الدورة (يوم)</Label>
              <Input id="cycleDuration" name="cycleDuration" type="number" min={1} max={365} defaultValue={defaults.cycleDuration} />
            </div>
          </div>
          <ActionToast toast={toast} />
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>{pending ? "جارٍ الحفظ…" : "حفظ"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
