import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl">
            🍄
          </div>
          <h1 className="text-2xl font-bold">نظام إدارة صوبة الماشروم</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            سجّل الدخول للوصول إلى لوحة التحكم
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
