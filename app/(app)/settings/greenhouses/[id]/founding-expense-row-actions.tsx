"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteFoundingExpenseAction, updateFoundingExpenseAction } from "@/actions/greenhouse";

type Expense = {
  id: string;
  date: string;
  amount: number;
  description: string;
  notes?: string | null;
};

export function FoundingExpenseRowActions({ expense }: { expense: Expense }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onDelete() {
    if (!confirm("حذف مصروف التأسيس؟")) return;
    startTransition(async () => {
      const result = await deleteFoundingExpenseAction(expense.id);
      if (!result.ok) alert(result.error);
      else router.refresh();
    });
  }

  function onUpdate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateFoundingExpenseAction(expense.id, formData);
      if (!result.ok) setError(result.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل مصروف التأسيس</DialogTitle>
          </DialogHeader>
          <form action={onUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-fe-date">التاريخ</Label>
              <Input id="edit-fe-date" name="date" type="date" required defaultValue={expense.date} className="tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-fe-amount">المبلغ (ج.م)</Label>
              <Input id="edit-fe-amount" name="amount" type="number" required min="0.01" step="0.01" defaultValue={expense.amount} className="tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-fe-description">التفاصيل</Label>
              <Input id="edit-fe-description" name="description" type="text" required maxLength={300} defaultValue={expense.description} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-fe-notes">ملاحظات</Label>
              <Input id="edit-fe-notes" name="notes" type="text" maxLength={300} defaultValue={expense.notes ?? ""} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={pending}>{pending ? "جارٍ الحفظ..." : "حفظ"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
