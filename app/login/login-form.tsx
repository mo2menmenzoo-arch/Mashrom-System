"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "جارٍ الدخول..." : "تسجيل الدخول"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, undefined);

  return (
    <Card>
      <CardContent className="p-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              dir="ltr"
              className="text-left"
              placeholder="admin@greenhouse.local"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              dir="ltr"
              className="text-left"
            />
          </div>
          {state?.error ? (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
