"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSaleAction } from "@/actions/sale";

type InventoryOption = { id: string; name: string; unit: string; balance: number };

export function SaleForm({
  cycleId,
  inventoryItems,
}: {
  cycleId: string;
  inventoryItems: InventoryOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cartons, setCartons] = useState("");
  const [price, setPrice] = useState("");
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);
  const total =
    cartons && price ? (Number(cartons) * Number(price)).toFixed(2) : null;

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createSaleAction(formData);
      if (!result.ok) setError(result.error);
      else {
        router.refresh();
        (document.getElementById("sale-form") as HTMLFormElement)?.reset();
        setCartons("");
        setPrice("");
      }
    });
  }

  return (
    <form id="sale-form" action={onSubmit} className="space-y-4">
      <input type="hidden" name="cycleId" value={cycleId} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <div className="space-y-2 md:col-span-2 lg:col-span-2">
          <Label htmlFor="customerName">اسم العميل</Label>
          <Input
            id="customerName"
            name="customerName"
            type="text"
            required
            maxLength={100}
            placeholder="اسم العميل أو الجهة..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cartons">عدد الكراتين</Label>
          <Input
            id="cartons"
            name="cartons"
            type="number"
            required
            min="1"
            step="1"
            placeholder="0"
            className="tabular-nums"
            value={cartons}
            onChange={(e) => setCartons(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pricePerCarton">سعر الكرتونة (ج.م)</Label>
          <Input
            id="pricePerCarton"
            name="pricePerCarton"
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="tabular-nums"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paid">المدفوع (ج.م)</Label>
          <Input
            id="paid"
            name="paid"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
            placeholder="0.00"
            className="tabular-nums"
          />
        </div>
        {inventoryItems.length > 0 && (
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Label htmlFor="inventoryItemId">خصم من المخزن (اختياري)</Label>
            <select
              id="inventoryItemId"
              name="inventoryItemId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">— بدون خصم من المخزن —</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (رصيد: {item.balance.toFixed(2)} {item.unit})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {total && (
        <div className="rounded-md bg-secondary px-4 py-2 text-sm">
          الإجمالي: <span className="font-bold tabular-nums text-success">{total} ج.م</span>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ..." : "تسجيل البيع"}
      </Button>
    </form>
  );
}
