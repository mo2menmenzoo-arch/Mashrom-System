"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateExpenseAction, deleteExpenseAction } from "@/actions/expense";

type Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  hasInventory: boolean;
};

export function ExpenseRowActions({ expense }: { expense: Expense }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function handleEdit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateExpenseAction(expense.id, formData);
        if (!result.ok) setError(result.error);
        else {
          setEditOpen(false);
          router.refresh();
        }
      } catch {
        setError("حدث خطأ غير متوقع");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteExpenseAction(expense.id);
        if (!result.ok) setError(result.error);
        else router.refresh();
      } catch {
        setError("حدث خطأ غير متوقع");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); setError(null); }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending} title="تعديل">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل مصروف</DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`exp-date-${expense.id}`}>التاريخ</Label>
                  <Input
                    id={`exp-date-${expense.id}`}
                    name="date"
                    type="date"
                    required
                    defaultValue={expense.date}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`exp-desc-${expense.id}`}>الوصف</Label>
                  <Input
                    id={`exp-desc-${expense.id}`}
                    name="description"
                    type="text"
                    required
                    maxLength={200}
                    defaultValue={expense.description}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`exp-amount-${expense.id}`}>المبلغ (ج.م)</Label>
                  <Input
                    id={`exp-amount-${expense.id}`}
                    name="amount"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    className="tabular-nums"
                    defaultValue={expense.amount}
                  />
                </div>
              </div>
              {expense.hasInventory && (
                <p className="text-xs text-muted-foreground">
                  ملاحظة: بيانات الصنف المرتبط بالمخزن لا يمكن تعديلها.
                </p>
              )}
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              className="text-destructive hover:text-destructive"
              title="حذف"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف المصروف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا المصروف؟
                {expense.hasInventory && " سيتم حذف الصنف المرتبط من المخزن أيضاً."}
                {" "}هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && (
        <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
