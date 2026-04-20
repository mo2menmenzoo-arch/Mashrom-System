"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

type FinDefaults = { currency: "EGP" | "USD"; taxRate: number };
const STORAGE_KEY = "fin_defaults";
const DEFAULTS: FinDefaults = { currency: "EGP", taxRate: 0 };

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export default function FinancialPage() {
  const [values, setValues] = useState<FinDefaults>(DEFAULTS);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setValues(JSON.parse(stored));
    } catch {}
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    setToast({ msg: "تم الحفظ بنجاح", ok: true });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات المالية</h1>
        <p className="text-sm text-muted-foreground">العملة الافتراضية ونسبة الضريبة</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">الإعدادات المالية الافتراضية</CardTitle>
            <CardDescription>تُستخدم كقيم مرجعية في تقارير النظام</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="currency">العملة الافتراضية</Label>
                <select
                  id="currency"
                  value={values.currency}
                  onChange={(e) => setValues((v) => ({ ...v, currency: e.target.value as "EGP" | "USD" }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxRate">نسبة الضريبة (%)</Label>
                <Input
                  id="taxRate" type="number" min={0} max={100} step={0.1}
                  value={values.taxRate}
                  onChange={(e) => setValues((v) => ({ ...v, taxRate: Number(e.target.value) }))}
                />
              </div>
            </div>
            {toast && <Toast msg={toast.msg} ok={toast.ok} />}
            <div className="flex justify-end">
              <Button type="submit">حفظ</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
