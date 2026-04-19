"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordPaymentAction } from "@/actions/sale";

export function PaymentForm({ saleId, remaining }: { saleId: string; remaining: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await recordPaymentAction(formData);
      if (!result.ok) setError(result.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-xs">
        تسجيل دفع
      </Button>
    );
  }

  return (
    <form action={onSubmit} className="flex items-center gap-2">
      <input type="hidden" name="saleId" value={saleId} />
      <Input
        name="additionalPaid"
        type="number"
        min="0.01"
        max={remaining}
        step="0.01"
        defaultValue={remaining.toFixed(2)}
        className="h-8 w-28 tabular-nums text-xs"
        autoFocus
      />
      <Button type="submit" size="sm" disabled={pending} className="text-xs">
        {pending ? "..." : "حفظ"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-xs"
      >
        إلغاء
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
