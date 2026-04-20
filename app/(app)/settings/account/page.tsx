"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock } from "lucide-react";
import { updateAccountAction, updatePasswordAction } from "@/actions/settings";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-2 text-sm font-medium ${ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
      {msg}
    </div>
  );
}

export default function AccountPage() {
  const [accountState, accountAction, accountPending] = useActionState(updateAccountAction, undefined);
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePasswordAction, undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إعدادات الحساب</h1>
        <p className="text-sm text-muted-foreground">تحديث معلوماتك الشخصية وكلمة المرور</p>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">المعلومات الشخصية</CardTitle>
            <CardDescription>اسمك وبريدك الإلكتروني الظاهر في النظام</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={accountAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input id="name" name="name" placeholder="أدخل اسمك" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" name="email" type="email" placeholder="example@email.com" required />
              </div>
            </div>
            {accountState && (
              <Toast msg={accountState.success ? "تم حفظ المعلومات بنجاح" : accountState.error} ok={accountState.success} />
            )}
            <div className="flex justify-end gap-2">
              <Button type="reset" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                إلغاء
              </Button>
              <Button type="submit" disabled={accountPending}>
                {accountPending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">تغيير كلمة المرور</CardTitle>
            <CardDescription>استخدم كلمة مرور قوية لا تقل عن 8 أحرف</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={passwordAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="current">كلمة المرور الحالية</Label>
                <Input id="current" name="current" type="password" placeholder="••••••••" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="next">كلمة المرور الجديدة</Label>
                <Input id="next" name="next" type="password" placeholder="••••••••" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
                <Input id="confirm" name="confirm" type="password" placeholder="••••••••" required />
              </div>
            </div>
            {passwordState && (
              <Toast msg={passwordState.success ? "تم تحديث كلمة المرور بنجاح" : passwordState.error} ok={passwordState.success} />
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={passwordPending}>
                {passwordPending ? "جارٍ التحديث…" : "تحديث كلمة المرور"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
