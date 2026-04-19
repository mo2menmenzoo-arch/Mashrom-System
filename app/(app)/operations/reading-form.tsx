"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOperationReadingAction } from "@/actions/operation";

const CLEANLINESS_OPTIONS = [
  { value: "EXCELLENT", label: "ممتاز" },
  { value: "GOOD", label: "جيد" },
  { value: "ACCEPTABLE", label: "مقبول" },
  { value: "POOR", label: "سيء" },
];

export function ReadingForm({ cycleId }: { cycleId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createOperationReadingAction(formData);
      if (!result.ok) setError(result.error);
      else {
        router.refresh();
        (document.getElementById("reading-form") as HTMLFormElement)?.reset();
      }
    });
  }

  return (
    <form id="reading-form" action={onSubmit} className="space-y-4">
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
        <div className="space-y-2">
          <Label htmlFor="temperature">درجة الحرارة (°م)</Label>
          <Input
            id="temperature"
            name="temperature"
            type="number"
            step="0.1"
            min="-50"
            max="100"
            placeholder="مثال: 22.5"
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="humidity">الرطوبة (%)</Label>
          <Input
            id="humidity"
            name="humidity"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="مثال: 85"
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="co2">CO₂ (ppm)</Label>
          <Input
            id="co2"
            name="co2"
            type="number"
            step="1"
            min="0"
            max="9999"
            placeholder="مثال: 1200"
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cleanliness">النظافة</Label>
          <select
            id="cleanliness"
            name="cleanliness"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">— اختر —</option>
            {CLEANLINESS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 lg:col-span-3">
          <Label htmlFor="notes">ملاحظات (اختياري)</Label>
          <Input
            id="notes"
            name="notes"
            type="text"
            maxLength={500}
            placeholder="أي ملاحظات تشغيلية..."
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ..." : "تسجيل القراءة"}
      </Button>
    </form>
  );
}
