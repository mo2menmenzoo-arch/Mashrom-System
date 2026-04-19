"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExpenseAction } from "@/actions/expense";

export function ExpenseForm({ cycleId }: { cycleId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isInventoryPurchase, setIsInventoryPurchase] = useState(false);
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(formData: FormData) {
    formData.set("isInventoryPurchase", isInventoryPurchase ? "true" : "false");
    setError(null);
    startTransition(async () => {
      const result = await createExpenseAction(formData);
      if (!result.ok) setError(result.error);
      else {
        router.refresh();
        (document.getElementById("expense-form") as HTMLFormElement)?.reset();
        setIsInventoryPurchase(false);
      }
    });
  }

  return (
    <form id="expense-form" action={onSubmit} className="space-y-4">
      <input type="hidden" name="cycleId" value={cycleId} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="date">التاريخ</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={today}
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">الوصف</Label>
          <Input
            id="description"
            name="description"
            type="text"
            required
            maxLength={200}
            placeholder="مثال: كهرباء، رواتب، نقل..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">المبلغ (ج.م)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="tabular-nums"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isInventoryPurchase"
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={isInventoryPurchase}
          onChange={(e) => setIsInventoryPurchase(e.target.checked)}
        />
        <Label htmlFor="isInventoryPurchase" className="cursor-pointer font-normal">
          شراء مستلزمات (إضافة للمخزن)
        </Label>
      </div>

      {isInventoryPurchase && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-4">
          <p className="text-sm font-medium text-primary">بيانات المخزن</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="inventoryName">اسم الصنف</Label>
              <Input
                id="inventoryName"
                name="inventoryName"
                type="text"
                required={isInventoryPurchase}
                maxLength={100}
                placeholder="مثال: بذور ماشروم، تربة..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventoryQty">الكمية</Label>
              <Input
                id="inventoryQty"
                name="inventoryQty"
                type="number"
                required={isInventoryPurchase}
                min="0.01"
                step="0.01"
                placeholder="0"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventoryUnit">الوحدة</Label>
              <Input
                id="inventoryUnit"
                name="inventoryUnit"
                type="text"
                maxLength={20}
                placeholder="كيلو / كرتونة / وحدة"
                defaultValue="وحدة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventoryExpiryDate">تاريخ الانتهاء (اختياري)</Label>
              <Input
                id="inventoryExpiryDate"
                name="inventoryExpiryDate"
                type="date"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventoryLowStockAt">تنبيه نفاد الكمية (اختياري)</Label>
              <Input
                id="inventoryLowStockAt"
                name="inventoryLowStockAt"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="عند وصول الكمية لـ..."
                className="tabular-nums"
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ..." : "إضافة مصروف"}
      </Button>
    </form>
  );
}
