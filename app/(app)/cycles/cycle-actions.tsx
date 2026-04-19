"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { closeCycleAction, deleteCycleAction } from "@/actions/cycle";

export function CycleActions({
  cycleId,
  status,
  hasData,
}: {
  cycleId: string;
  status: string;
  hasData: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await closeCycleAction(cycleId);
        if (!result.ok) setError(result.error);
        else router.refresh();
      } catch {
        setError("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteCycleAction(cycleId);
        if (!result.ok) setError(result.error);
        else router.refresh();
      } catch {
        setError("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={pending || status === "ENDED"}
            >
              إنهاء
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>إنهاء الدورة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من إنهاء هذه الدورة؟ لن تتمكن من إضافة بيانات جديدة إليها بعد ذلك.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleClose}>
                تأكيد الإنهاء
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending || hasData}
            >
              حذف
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الدورة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذه الدورة نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
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
