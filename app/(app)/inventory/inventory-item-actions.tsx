"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
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
  updateInventoryItemAction,
  deleteInventoryItemAction,
  addInventoryTxnAction,
} from "@/actions/inventory";

type Item = {
  id: string;
  name: string;
  unit: string;
  expiryDate: string | null;
  lowStockAt: number | null;
  source: string;
};

export function InventoryItemActions({ item }: { item: Item }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [txnError, setTxnError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleEdit(formData: FormData) {
    setEditError(null);
    startTransition(async () => {
      try {
        const result = await updateInventoryItemAction(item.id, formData);
        if (!result.ok) setEditError(result.error ?? "خطأ");
        else {
          setEditOpen(false);
          router.refresh();
        }
      } catch {
        setEditError("حدث خطأ غير متوقع");
      }
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      try {
        const result = await deleteInventoryItemAction(item.id);
        if (!result.ok) setDeleteError(result.error ?? "خطأ");
        else router.refresh();
      } catch {
        setDeleteError("حدث خطأ غير متوقع");
      }
    });
  }

  function handleAddTxn(formData: FormData) {
    setTxnError(null);
    startTransition(async () => {
      try {
        const result = await addInventoryTxnAction(item.id, formData);
        if (!result.ok) setTxnError(result.error ?? "خطأ");
        else {
          setTxnOpen(false);
          router.refresh();
        }
      } catch {
        setTxnError("حدث خطأ غير متوقع");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      {/* Add Transaction */}
      <Dialog open={txnOpen} onOpenChange={(o) => { setTxnOpen(o); setTxnError(null); }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={pending} title="إضافة حركة">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>إضافة حركة — {item.name}</DialogTitle>
          </DialogHeader>
          <form action={handleAddTxn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`txn-type-${item.id}`}>النوع</Label>
              <select
                id={`txn-type-${item.id}`}
                name="type"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                defaultValue="IN"
              >
                <option value="IN">إضافة (وارد)</option>
                <option value="OUT">سحب (صادر)</option>
                <option value="ADJUST">تعديل (جرد)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`txn-qty-${item.id}`}>الكمية ({item.unit})</Label>
              <Input
                id={`txn-qty-${item.id}`}
                name="qty"
                type="number"
                required
                min="0.01"
                step="0.01"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`txn-reason-${item.id}`}>السبب (اختياري)</Label>
              <Input
                id={`txn-reason-${item.id}`}
                name="reason"
                type="text"
                maxLength={200}
              />
            </div>
            {txnError && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{txnError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTxnOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); setEditError(null); }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={pending} title="تعديل">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل صنف — {item.name}</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`item-name-${item.id}`}>اسم الصنف</Label>
              <Input
                id={`item-name-${item.id}`}
                name="name"
                type="text"
                required
                maxLength={100}
                defaultValue={item.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`item-unit-${item.id}`}>الوحدة</Label>
              <Input
                id={`item-unit-${item.id}`}
                name="unit"
                type="text"
                required
                maxLength={20}
                defaultValue={item.unit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`item-expiry-${item.id}`}>تاريخ الانتهاء (اختياري)</Label>
              <Input
                id={`item-expiry-${item.id}`}
                name="expiryDate"
                type="date"
                defaultValue={item.expiryDate ?? ""}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`item-lowstock-${item.id}`}>حد التنبيه — كمية منخفضة (اختياري)</Label>
              <Input
                id={`item-lowstock-${item.id}`}
                name="lowStockAt"
                type="number"
                min="0.01"
                step="0.01"
                className="tabular-nums"
                defaultValue={item.lowStockAt ?? ""}
              />
            </div>
            {editError && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{editError}</p>
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

      {/* Delete Item */}
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
            <AlertDialogTitle>حذف الصنف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف &quot;{item.name}&quot;؟ سيتم حذف جميع حركاته أيضاً. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{deleteError}</p>
          )}
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
  );
}
