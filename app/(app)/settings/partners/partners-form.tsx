"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Partner = { id: string; name: string; share: number };
const STORAGE_KEY = "partner_shares";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export function PartnerSharesForm() {
  const [partners, setPartners] = useState<Partner[]>([
    { id: crypto.randomUUID(), name: "", share: 0 },
  ]);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) setPartners(parsed);
      }
    } catch {}
  }, []);

  const total = partners.reduce((sum, p) => sum + (Number(p.share) || 0), 0);
  const overLimit = total > 100;

  function addPartner() {
    setPartners((prev) => [...prev, { id: crypto.randomUUID(), name: "", share: 0 }]);
  }

  function removePartner(id: string) {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePartner(id: string, field: keyof Omit<Partner, "id">, value: string | number) {
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function handleSave() {
    if (overLimit) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(partners));
    setToast({ msg: "تم حفظ توزيع الأرباح بنجاح", ok: true });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_120px_40px] gap-3 px-1">
        <p className="text-xs font-medium text-muted-foreground">اسم الشريك</p>
        <p className="text-xs font-medium text-muted-foreground">النسبة (%)</p>
        <span />
      </div>

      {/* Partner rows */}
      {partners.map((partner) => (
        <div key={partner.id} className="grid grid-cols-[1fr_120px_40px] items-center gap-3">
          <Input
            placeholder="اسم الشريك"
            value={partner.name}
            onChange={(e) => updatePartner(partner.id, "name", e.target.value)}
          />
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="0"
            value={partner.share}
            onChange={(e) => updatePartner(partner.id, "share", Number(e.target.value))}
          />
          <button
            type="button"
            onClick={() => removePartner(partner.id)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Add partner */}
      <Button type="button" variant="outline" size="sm" onClick={addPartner} className="gap-2">
        <Plus className="h-4 w-4" />
        إضافة شريك
      </Button>

      {/* Total bar */}
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium",
          total === 100
            ? "border-green-500/30 bg-green-500/10 text-green-600"
            : overLimit
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-amber-500/30 bg-amber-500/10 text-amber-600",
        )}
      >
        <span>الإجمالي: {total.toFixed(1)}%</span>
        {overLimit && <span>تجاوز 100%! يرجى تصحيح النسب.</span>}
        {!overLimit && total < 100 && <span>المتبقي: {(100 - total).toFixed(1)}%</span>}
        {total === 100 && <span>✓ مكتمل</span>}
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={overLimit}>
          حفظ التوزيع
        </Button>
      </div>
    </div>
  );
}
