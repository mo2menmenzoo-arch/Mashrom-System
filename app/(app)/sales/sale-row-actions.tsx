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
import { updateSaleAction, deleteSaleAction } from "@/actions/sale";

type InventoryOption = { id: string; name: string; unit: string };

type Sale = {
  id: string;
  date: string;
  customerName: string;
  cartons: number;
  pricePerCarton: number;
  paid: number;
  inventoryItemId: string | null;
};

export function SaleRowActions({
  sale,
  inventoryItems,
}: {
  sale: Sale;
  inventoryItems: InventoryOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [cartons, setCartons] = useState(String(sale.cartons));
  const [price, setPrice] = useState(String(sale.pricePerCarton));

  const previewTotal =
    cartons && price ? (Number(cartons) * Number(price)).toFixed(2) : null;

  function handleEdit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateSaleAction(sale.id, formData);
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
        const result = await deleteSaleAction(sale.id);
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>تعديل بيع</DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`sale-date-${sale.id}`}>التاريخ</Label>
                  <Input
                    id={`sale-date-${sale.id}`}
                    name="date"
                    type="date"
                    required
                    defaultValue={sale.date}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sale-customer-${sale.id}`}>اسم العميل</Label>
                  <Input
                    id={`sale-customer-${sale.id}`}
                    name="customerName"
                    type="text"
                    required
                    maxLength={100}
                    defaultValue={sale.customerName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sale-cartons-${sale.id}`}>عدد الكراتين</Label>
                  <Input
                    id={`sale-cartons-${sale.id}`}
                    name="cartons"
                    type="number"
                    required
                    min="1"
                    step="1"
                    className="tabular-nums"
                    value={cartons}
                    onChange={(e) => setCartons(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sale-price-${sale.id}`}>سعر الكرتونة (ج.م)</Label>
                  <Input
                    id={`sale-price-${sale.id}`}
                    name="pricePerCarton"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    className="tabular-nums"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sale-paid-${sale.id}`}>المدفوع (ج.م)</Label>
                  <Input
                    id={`sale-paid-${sale.id}`}
                    name="paid"
                    type="number"
                    min="0"
                    step="0.01"
                    className="tabular-nums"
                    defaultValue={sale.paid}
                  />
                </div>
              </div>
              {previewTotal && (
                <p className="rounded-md bg-secondary px-4 py-2 text-sm">
                  الإجمالي:{" "}
                  <span className="font-bold tabular-nums text-success">{previewTotal} ج.م</span>
                </p>
              )}
              {sale.inventoryItemId && (
                <p className="text-xs text-muted-foreground">
                  ملاحظة: تغيير عدد الكراتين سيحدّث رصيد المخزن تلقائياً.
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
              <AlertDialogTitle>حذف البيع</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا البيع؟
                {sale.inventoryItemId && " سيتم استعادة الكمية في المخزن."}
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
