"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { updatePartnersAction } from "@/actions/settings";

type Partner = { id: string; name: string; sharePercent: number };

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export function PartnerSharesForm({ initialPartners }: { initialPartners: Partner[] }) {
  const [partners, setPartners] = useState<Partner[]>(
    initialPartners.length > 0
      ? initialPartners
      : [{ id: crypto.randomUUID(), name: "", sharePercent: 0 }],
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const total = partners.reduce((sum, p) => sum + (Number(p.sharePercent) || 0), 0);
  const overLimit = total > 100;

  function addPartner() {
    setPartners((prev) => [...prev, { id: crypto.randomUUID(), name: "", sharePercent: 0 }]);
  }

  function removePartner(id: string) {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePartner(id: string, field: "name" | "sharePercent", value: string | number) {
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  async function handleSave() {
    if (overLimit) return;
    setSaving(true);
    try {
      const result = await updatePartnersAction(
        partners.map((p, i) => ({ name: p.name, sharePercent: Number(p.sharePercent) || 0, position: i })),
      );
      setToast({ msg: result.success ? "تم حفظ توزيع الأرباح بنجاح" : result.error, ok: result.success });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_120px_40px] gap-3 px-1">
        <p className="text-xs font-medium text-muted-foreground">اسم الشريك</p>
        <p className="text-xs font-medium text-muted-foreground">النسبة (%)</p>
        <span />
      </div>

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
            value={partner.sharePercent}
            onChange={(e) => updatePartner(partner.id, "sharePercent", Number(e.target.value))}
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

      <Button type="button" variant="outline" size="sm" onClick={addPartner} className="gap-2">
        <Plus className="h-4 w-4" />
        إضافة شريك
      </Button>

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
        <Button onClick={handleSave} disabled={overLimit || saving}>
          {saving ? "جارٍ الحفظ…" : "حفظ التوزيع"}
        </Button>
      </div>
    </div>
  );
}
