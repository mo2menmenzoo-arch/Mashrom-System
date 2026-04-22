"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addInventoryItemAction } from "@/actions/inventory";

export function AddInventoryItemDialog({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("cycleId", cycleId);
    startTransition(async () => {
      try {
        const result = await addInventoryItemAction(formData);
        if (!result.ok) setError(result.error ?? "خطأ");
        else {
          setOpen(false);
          router.refresh();
        }
      } catch {
        setError("حدث خطأ غير متوقع");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          إضافة صنف
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة صنف جديد للمخزن</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-item-name">اسم الصنف</Label>
            <Input
              id="add-item-name"
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="مثال: بذور فطر"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-item-qty">الكمية الأولية</Label>
              <Input
                id="add-item-qty"
                name="initialQty"
                type="number"
                required
                min="0.01"
                step="0.01"
                className="tabular-nums"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-item-unit">الوحدة</Label>
              <Input
                id="add-item-unit"
                name="unit"
                type="text"
                required
                maxLength={20}
                defaultValue="وحدة"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-item-expiry">تاريخ الانتهاء (اختياري)</Label>
            <Input
              id="add-item-expiry"
              name="expiryDate"
              type="date"
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-item-lowstock">حد التنبيه — كمية منخفضة (اختياري)</Label>
            <Input
              id="add-item-lowstock"
              name="lowStockAt"
              type="number"
              min="0.01"
              step="0.01"
              className="tabular-nums"
              placeholder="0.00"
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ..." : "إضافة الصنف"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
