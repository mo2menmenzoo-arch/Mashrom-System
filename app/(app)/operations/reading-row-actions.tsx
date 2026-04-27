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
import { updateOperationReadingAction, deleteOperationReadingAction } from "@/actions/operation";
import { MEDICINE_OPTIONS } from "@/lib/medicines";

const CLEANLINESS_OPTIONS = [
  { value: "EXCELLENT", label: "ممتاز" },
  { value: "GOOD", label: "جيد" },
  { value: "ACCEPTABLE", label: "مقبول" },
  { value: "POOR", label: "سيء" },
];

type Reading = {
  id: string;
  dayNumber: number;
  temperature: number | null;
  humidity: number | null;
  co2: number | null;
  cleanliness: string | null;
  notes: string | null;
  watered: boolean;
  medicines: string[];
};

export function ReadingRowActions({ reading }: { reading: Reading }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function handleEdit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateOperationReadingAction(reading.id, formData);
        if (!result.ok) setError(result.error);
        else { setEditOpen(false); router.refresh(); }
      } catch { setError("حدث خطأ غير متوقع"); }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteOperationReadingAction(reading.id);
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>تعديل قراءة اليوم {reading.dayNumber}</DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`r-temp-${reading.id}`}>درجة الحرارة (°م)</Label>
                  <Input
                    id={`r-temp-${reading.id}`}
                    name="temperature"
                    type="number"
                    step="0.1"
                    min="-50"
                    max="100"
                    className="tabular-nums"
                    defaultValue={reading.temperature ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`r-hum-${reading.id}`}>الرطوبة (%)</Label>
                  <Input
                    id={`r-hum-${reading.id}`}
                    name="humidity"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="tabular-nums"
                    defaultValue={reading.humidity ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`r-co2-${reading.id}`}>CO₂ (ppm)</Label>
                  <Input
                    id={`r-co2-${reading.id}`}
                    name="co2"
                    type="number"
                    step="1"
                    min="0"
                    max="9999"
                    className="tabular-nums"
                    defaultValue={reading.co2 ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`r-clean-${reading.id}`}>النظافة</Label>
                  <select
                    id={`r-clean-${reading.id}`}
                    name="cleanliness"
                    defaultValue={reading.cleanliness ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">— اختر —</option>
                    {CLEANLINESS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor={`r-notes-${reading.id}`}>ملاحظات</Label>
                  <Input
                    id={`r-notes-${reading.id}`}
                    name="notes"
                    type="text"
                    maxLength={500}
                    defaultValue={reading.notes ?? ""}
                  />
                </div>

                <div className="space-y-2 lg:col-span-3">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="watered"
                      defaultChecked={reading.watered}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span>تم الري اليوم</span>
                  </Label>
                </div>

                <div className="space-y-2 lg:col-span-3">
                  <Label>الأدوية المستخدمة</Label>
                  <div className="flex flex-wrap gap-3">
                    {MEDICINE_OPTIONS.map((med) => (
                      <Label key={med} className="flex items-center gap-1.5 cursor-pointer font-normal">
                        <input
                          type="checkbox"
                          name="medicines"
                          value={med}
                          defaultChecked={reading.medicines.includes(med)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="text-sm">{med}</span>
                      </Label>
                    ))}
                  </div>
                </div>
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
              <AlertDialogTitle>حذف القراءة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف قراءة اليوم {reading.dayNumber}؟ هذا الإجراء لا يمكن التراجع عنه.
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
