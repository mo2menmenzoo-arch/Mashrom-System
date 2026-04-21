"use client";

import { useTransition } from "react";
import { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateUserRole, toggleUserActive } from "./actions";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  active: boolean;
  formattedDate: string;
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "مدير",
  OPERATOR: "مشغّل",
  ACCOUNTANT: "محاسب",
};

function RoleCell({ user }: { user: User }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={user.role}
      disabled={pending}
      onChange={(e) => {
        const role = e.target.value as Role;
        startTransition(() => updateUserRole(user.id, role));
      }}
      className="rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
    >
      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
      ))}
    </select>
  );
}

function ActiveCell({ user }: { user: User }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={user.active ? "outline" : "secondary"}
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleUserActive(user.id))}
    >
      {pending ? "..." : user.active ? "تعطيل" : "تفعيل"}
    </Button>
  );
}

export function UsersTable({ users }: { users: User[] }) {
  if (users.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        لا يوجد مستخدمون.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-right text-xs text-muted-foreground">
          <tr>
            <th className="py-2 font-medium">الاسم</th>
            <th className="py-2 font-medium">البريد الإلكتروني</th>
            <th className="py-2 font-medium">الدور</th>
            <th className="py-2 font-medium">الحالة</th>
            <th className="py-2 font-medium">تاريخ الإنشاء</th>
            <th className="py-2 font-medium">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-3 font-medium">{user.name}</td>
              <td className="py-3 tabular-nums" dir="ltr">{user.email}</td>
              <td className="py-3"><RoleCell user={user} /></td>
              <td className="py-3">
                <Badge variant={user.active ? "success" : "secondary"}>
                  {user.active ? "نشط" : "معطّل"}
                </Badge>
              </td>
              <td className="py-3 tabular-nums">{user.formattedDate}</td>
              <td className="py-3"><ActiveCell user={user} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
