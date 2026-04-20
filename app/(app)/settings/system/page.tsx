"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Sun, Moon, Download } from "lucide-react";
import { exportAllDataAction } from "@/actions/settings";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export default function SystemPage() {
  const [dark, setDark] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportAllDataAction();
      if (!result.success) {
        setToast({ msg: result.error, ok: false });
        return;
      }
      const blob = new Blob([result.csv!], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mushroom-data-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ msg: "تم تصدير البيانات بنجاح", ok: true });
    } finally {
      setExporting(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">النظام والبيانات</h1>
        <p className="text-sm text-muted-foreground">إعدادات المظهر وتصدير البيانات</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">النظام والبيانات</CardTitle>
            <CardDescription>تحكم في مظهر التطبيق وتصدير جميع البيانات</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Toggle */}
          <div>
            <p className="mb-3 text-sm font-semibold">المظهر</p>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{dark ? "الوضع الليلي" : "الوضع النهاري"}</p>
                <p className="text-xs text-muted-foreground">تبديل مظهر التطبيق</p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted transition-colors hover:bg-muted/70"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Export */}
          <div>
            <p className="mb-3 text-sm font-semibold">تصدير البيانات</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" disabled={exporting} onClick={handleExport}>
                <Download className="me-2 h-4 w-4" />
                {exporting ? "جارٍ التصدير…" : "تصدير CSV"}
              </Button>
              <Button variant="outline" disabled={exporting} onClick={handleExport}>
                <Download className="me-2 h-4 w-4" />
                {exporting ? "جارٍ التصدير…" : "تصدير Excel"}
              </Button>
            </div>
          </div>

          {toast && <Toast msg={toast.msg} ok={toast.ok} />}
        </CardContent>
      </Card>
    </div>
  );
}
