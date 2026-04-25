"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDepositAction, createWithdrawalAction } from "@/actions/custody";

export function DepositForm({ cycleId }: { cycleId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createDepositAction(formData);
      if (!result.ok) setError(result.error);
      else {
        router.refresh();
        (document.getElementById("deposit-form") as HTMLFormElement)?.reset();
      }
    });
  }

  return (
    <form id="deposit-form" action={onSubmit} className="space-y-4">
      <input type="hidden" name="cycleId" value={cycleId} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="deposit-date">التاريخ</Label>
          <Input
            id="deposit-date"
            name="date"
            type="date"
            required
            defaultValue={today}
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deposit-amount">المبلغ (ج.م)</Label>
          <Input
            id="deposit-amount"
            name="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deposit-notes">ملاحظات (اختياري)</Label>
          <Input
            id="deposit-notes"
            name="notes"
            type="text"
            maxLength={200}
            placeholder="مصدر الإيداع..."
          />
        </div>
      </div>
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" disabled={pending} className="bg-success hover:bg-success/90">
        {pending ? "جارٍ الحفظ..." : "إيداع في العهدة"}
      </Button>
    </form>
  );
}

export function WithdrawalForm({
  cycleId,
  greenhouseId,
  balance,
}: {
  cycleId: string;
  greenhouseId: string;
  balance: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<"OPERATING" | "FOUNDING">("OPERATING");
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createWithdrawalAction(formData);
      if (!result.ok) setError(result.error);
      else {
        router.refresh();
        (document.getElementById("withdrawal-form") as HTMLFormElement)?.reset();
        setCategory("OPERATING");
      }
    });
  }

  return (
    <form id="withdrawal-form" action={onSubmit} className="space-y-4">
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="greenhouseId" value={greenhouseId} />
      <input type="hidden" name="category" value={category} />

      <div className="space-y-2">
        <Label>نوع الصرف</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={category === "OPERATING"}
              onChange={() => setCategory("OPERATING")}
              className="accent-primary"
            />
            <span className="text-sm">مصاريف تشغيل</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={category === "FOUNDING"}
              onChange={() => setCategory("FOUNDING")}
              className="accent-primary"
            />
            <span className="text-sm">مصاريف تأسيس</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="wd-date">التاريخ</Label>
          <Input
            id="wd-date"
            name="date"
            type="date"
            required
            defaultValue={today}
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wd-amount">المبلغ (ج.م)</Label>
          <Input
            id="wd-amount"
            name="amount"
            type="number"
            required
            min="0.01"
            max={balance}
            step="0.01"
            placeholder="0.00"
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wd-description">الوصف</Label>
          <Input
            id="wd-description"
            name="description"
            type="text"
            required
            maxLength={200}
            placeholder="مثال: شراء مستلزمات..."
          />
        </div>
      </div>
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" disabled={pending} variant="destructive">
        {pending ? "جارٍ الحفظ..." : "صرف من العهدة"}
      </Button>
    </form>
  );
}
