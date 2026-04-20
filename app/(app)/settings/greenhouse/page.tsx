"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf } from "lucide-react";

type GhDefaults = { temperature: number; humidity: number; duration: number };
const STORAGE_KEY = "gh_defaults";
const DEFAULTS: GhDefaults = { temperature: 22, humidity: 85, duration: 60 };

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export default function GreenhousePage() {
  const [values, setValues] = useState<GhDefaults>(DEFAULTS);
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
        <h1 className="text-2xl font-bold">إعدادات الصوبة</h1>
        <p className="text-sm text-muted-foreground">القيم الافتراضية عند إنشاء دورة جديدة</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <Leaf className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">القيم الافتراضية للصوبة</CardTitle>
            <CardDescription>درجة الحرارة والرطوبة المستهدفة ومدة الدورة</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="temperature">درجة الحرارة المستهدفة (°م)</Label>
                <Input
                  id="temperature" type="number" min={0} max={50}
                  value={values.temperature}
                  onChange={(e) => setValues((v) => ({ ...v, temperature: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="humidity">الرطوبة المستهدفة (%)</Label>
                <Input
                  id="humidity" type="number" min={0} max={100}
                  value={values.humidity}
                  onChange={(e) => setValues((v) => ({ ...v, humidity: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">مدة الدورة (يوم)</Label>
                <Input
                  id="duration" type="number" min={1} max={365}
                  value={values.duration}
                  onChange={(e) => setValues((v) => ({ ...v, duration: Number(e.target.value) }))}
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
