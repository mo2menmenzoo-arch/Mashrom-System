"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { upsertUserPermissionsAction, deleteUserPermissionsAction } from "./actions";
import type { PermissionsInput } from "./actions";

type Section = {
  key: keyof PermissionsInput;
  editKey: keyof PermissionsInput;
  label: string;
  noEdit?: boolean;
};

const SECTIONS: Section[] = [
  { key: "viewOperations", editKey: "editOperations", label: "جدول التشغيل" },
  { key: "viewSales",      editKey: "editSales",      label: "المبيعات" },
  { key: "viewInventory",  editKey: "editInventory",  label: "المخزون" },
  { key: "viewExpenses",   editKey: "editExpenses",   label: "المصروفات" },
  { key: "viewCustody",    editKey: "editCustody",    label: "العهدة" },
  { key: "viewReports",    editKey: "viewReports",    label: "التقارير", noEdit: true },
];

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  permissions: PermissionsInput | null;
};

const DEFAULT_PERMS: PermissionsInput = {
  viewOperations: true, editOperations: false,
  viewSales: true,      editSales: false,
  viewInventory: true,  editInventory: false,
  viewExpenses: true,   editExpenses: false,
  viewCustody: true,    editCustody: false,
  viewReports: true,
};

export function PermissionsModal({ user }: { user: UserRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [perms, setPerms] = useState<PermissionsInput>(user.permissions ?? DEFAULT_PERMS);

  function toggle(key: keyof PermissionsInput) {
    setPerms((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const k = key as string;
      if (k.startsWith("view")) {
        const editKey = ("edit" + k.slice(4)) as keyof PermissionsInput;
        if (editKey in next && !next[key]) (next as Record<string, boolean>)[editKey] = false;
      }
      if (k.startsWith("edit")) {
        const viewKey = ("view" + k.slice(4)) as keyof PermissionsInput;
        if (viewKey in next && next[key]) (next as Record<string, boolean>)[viewKey] = true;
      }
      return next;
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertUserPermissionsAction(user.id, perms);
        setOpen(false);
        router.refresh();
      } catch { setError("حدث خطأ أثناء الحفظ"); }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteUserPermissionsAction(user.id);
        setPerms(DEFAULT_PERMS);
        setOpen(false);
        router.refresh();
      } catch { setError("حدث خطأ أثناء إزالة التخصيص"); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">الصلاحيات</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>صلاحيات {user.name ?? user.email}</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 text-right font-medium">القسم</th>
                <th className="py-2 text-center font-medium">رؤية</th>
                <th className="py-2 text-center font-medium">تعديل</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((s) => (
                <tr key={s.key} className="border-b last:border-0">
                  <td className="py-2">{s.label}</td>
                  <td className="py-2 text-center">
                    <input
                      type="checkbox"
                      checked={perms[s.key]}
                      onChange={() => toggle(s.key)}
                      className="h-4 w-4 rounded border-input"
                    />
                  </td>
                  <td className="py-2 text-center">
                    {s.noEdit ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={perms[s.editKey]}
                        onChange={() => toggle(s.editKey)}
                        disabled={!perms[s.key]}
                        className="h-4 w-4 rounded border-input disabled:opacity-40"
                      />
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-b last:border-0 opacity-50">
                <td className="py-2">الإجماليات المالية / الشركاء</td>
                <td className="py-2 text-center"><Badge variant="secondary" className="text-xs">مقفول</Badge></td>
                <td className="py-2 text-center"><Badge variant="secondary" className="text-xs">مقفول</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" disabled={pending} onClick={handleRemove}>
            إزالة التخصيص
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button disabled={pending} onClick={handleSave}>
              {pending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
