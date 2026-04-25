"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFoundingExpenseAction } from "@/actions/greenhouse";

export function FoundingExpenseForm({ greenhouseId }: { greenhouseId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createFoundingExpenseAction(formData);
      if (!result.ok) setError(result.error);
      else {
        router.refresh();
        (document.getElementById("founding-expense-form") as HTMLFormElement)?.reset();
      }
    });
  }

  return (
    <form id="founding-expense-form" action={onSubmit} className="space-y-4 border-b pb-4">
      <input type="hidden" name="greenhouseId" value={greenhouseId} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="fe-date">التاريخ</Label>
          <Input id="fe-date" name="date" type="date" required defaultValue={today} className="tabular-nums" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fe-amount">المبلغ (ج.م)</Label>
          <Input id="fe-amount" name="amount" type="number" required min="0.01" step="0.01" placeholder="0.00" className="tabular-nums" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fe-description">التفاصيل</Label>
          <Input id="fe-description" name="description" type="text" required maxLength={300} placeholder="مثال: معدات، تجهيز..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fe-notes">ملاحظات (اختياري)</Label>
          <Input id="fe-notes" name="notes" type="text" maxLength={300} />
        </div>
      </div>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "جارٍ الحفظ..." : "إضافة مصروف تأسيس"}
      </Button>
    </form>
  );
}
