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
import {
  updateDepositAction,
  deleteDepositAction,
  updateWithdrawalAction,
  deleteWithdrawalAction,
} from "@/actions/custody";

type DepositRecord = {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
};

type WithdrawalRecord = {
  id: string;
  date: string;
  description: string;
  amount: number;
};

export function DepositRowActions({ deposit }: { deposit: DepositRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function handleEdit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateDepositAction(deposit.id, formData);
        if (!result.ok) setError(result.error);
        else { setEditOpen(false); router.refresh(); }
      } catch { setError("حدث خطأ غير متوقع"); }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteDepositAction(deposit.id);
        if (!result.ok) setError(result.error);
        else router.refresh();
      } catch { setError("حدث خطأ غير متوقع"); }
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
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>تعديل إيداع</DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`dep-date-${deposit.id}`}>التاريخ</Label>
                <Input
                  id={`dep-date-${deposit.id}`}
                  name="date"
                  type="date"
                  required
                  defaultValue={deposit.date}
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`dep-amount-${deposit.id}`}>المبلغ (ج.م)</Label>
                <Input
                  id={`dep-amount-${deposit.id}`}
                  name="amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="tabular-nums"
                  defaultValue={deposit.amount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`dep-notes-${deposit.id}`}>ملاحظات (اختياري)</Label>
                <Input
                  id={`dep-notes-${deposit.id}`}
                  name="notes"
                  type="text"
                  maxLength={200}
                  defaultValue={deposit.notes ?? ""}
                />
              </div>
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending}
              className="text-destructive hover:text-destructive" title="حذف">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الإيداع</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا الإيداع؟ هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && (
        <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

export function WithdrawalRowActions({ withdrawal }: { withdrawal: WithdrawalRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function handleEdit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateWithdrawalAction(withdrawal.id, formData);
        if (!result.ok) setError(result.error);
        else { setEditOpen(false); router.refresh(); }
      } catch { setError("حدث خطأ غير متوقع"); }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteWithdrawalAction(withdrawal.id);
        if (!result.ok) setError(result.error);
        else router.refresh();
      } catch { setError("حدث خطأ غير متوقع"); }
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
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>تعديل صرفية</DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`wd-date-${withdrawal.id}`}>التاريخ</Label>
                <Input
                  id={`wd-date-${withdrawal.id}`}
                  name="date"
                  type="date"
                  required
                  defaultValue={withdrawal.date}
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`wd-amount-${withdrawal.id}`}>المبلغ (ج.م)</Label>
                <Input
                  id={`wd-amount-${withdrawal.id}`}
                  name="amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="tabular-nums"
                  defaultValue={withdrawal.amount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`wd-desc-${withdrawal.id}`}>الوصف</Label>
                <Input
                  id={`wd-desc-${withdrawal.id}`}
                  name="description"
                  type="text"
                  required
                  maxLength={200}
                  defaultValue={withdrawal.description}
                />
              </div>
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending}
              className="text-destructive hover:text-destructive" title="حذف">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الصرفية</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذه الصرفية؟ هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && (
        <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
