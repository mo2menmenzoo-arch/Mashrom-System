"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Sun, Moon, Download, Printer } from "lucide-react";
import { exportAllDataAction, exportExcelAction, getPrintDataAction, updateThemePreferenceAction } from "@/actions/settings";
import type { PrintData } from "@/actions/settings";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

function buildPrintHtml(data: PrintData): string {
  function table(title: string, headers: string[], rows: string[][]): string {
    return `
      <h2>${title}</h2>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>تقرير بيانات الصوبة</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600&display=swap');
    body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; font-size: 12px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin-top: 24px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: right; }
    th { background: #f0f0f0; font-weight: 600; }
    @media print { body { padding: 0; } h2 { page-break-before: auto; } }
  </style>
</head>
<body>
  <h1>تقرير بيانات الصوبة — ${new Date().toLocaleDateString("ar-EG")}</h1>
  ${table("المبيعات", ["التاريخ", "العميل", "الكراتين", "الإجمالي", "الدورة"], data.sales.map((s) => [s.date, s.customerName, String(s.cartons), String(s.total), String(s.cycle)]))}
  ${table("المصروفات", ["التاريخ", "الوصف", "المبلغ", "الدورة"], data.expenses.map((e) => [e.date, e.description, String(e.amount), String(e.cycle)]))}
  ${table("إيداعات العهدة", ["التاريخ", "المبلغ", "ملاحظات"], data.deposits.map((d) => [d.date, String(d.amount), d.notes]))}
  ${table("صرفيات العهدة", ["التاريخ", "الوصف", "المبلغ"], data.withdrawals.map((w) => [w.date, w.description, String(w.amount)]))}
  ${table("المخزن", ["الاسم", "الكمية الأولية", "الوحدة"], data.inventory.map((i) => [i.name, String(i.initialQty), i.unit]))}
</body>
</html>`;
}

export default function SystemPage() {
  const [dark, setDark] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    await updateThemePreferenceAction(next ? "dark" : "light");
  }

  async function handleExportCsv() {
    setBusy(true);
    try {
      const result = await exportAllDataAction();
      if (!result.success) { showToast(result.error, false); return; }
      const blob = new Blob([result.csv!], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mushroom-data-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("تم تصدير CSV بنجاح", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleExportExcel() {
    setBusy(true);
    try {
      const result = await exportExcelAction();
      if (!result.success) { showToast(result.error, false); return; }
      const bytes = Uint8Array.from(atob(result.base64!), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mushroom-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("تم تصدير Excel بنجاح", true);
    } finally {
      setBusy(false);
    }
  }

  async function handlePrintPdf() {
    setBusy(true);
    try {
      const result = await getPrintDataAction();
      if (!result.success) { showToast(result.error, false); return; }

      const printDiv = document.createElement("div");
      printDiv.id = "print-content";
      printDiv.innerHTML = buildPrintHtml(result.data!);

      const style = document.createElement("style");
      style.id = "print-hide-style";
      style.textContent = `@media print { body > *:not(#print-content) { display: none !important; } #print-content { display: block !important; } }`;

      document.body.appendChild(printDiv);
      document.head.appendChild(style);

      window.print();

      const cleanup = () => {
        document.getElementById("print-content")?.remove();
        document.getElementById("print-hide-style")?.remove();
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      setTimeout(cleanup, 5000);
    } finally {
      setBusy(false);
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
              <Button variant="outline" disabled={busy} onClick={handleExportCsv}>
                <Download className="me-2 h-4 w-4" />
                {busy ? "جارٍ التصدير…" : "تصدير CSV"}
              </Button>
              <Button variant="outline" disabled={busy} onClick={handleExportExcel}>
                <Download className="me-2 h-4 w-4" />
                {busy ? "جارٍ التصدير…" : "تصدير Excel"}
              </Button>
              <Button variant="outline" disabled={busy} onClick={handlePrintPdf}>
                <Printer className="me-2 h-4 w-4" />
                {busy ? "جارٍ التحميل…" : "طباعة / PDF"}
              </Button>
            </div>
          </div>

          {toast && <Toast msg={toast.msg} ok={toast.ok} />}
        </CardContent>
      </Card>
    </div>
  );
}
