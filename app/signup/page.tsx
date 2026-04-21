import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  const hasGoogle = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[hsl(150,55%,18%)] to-[hsl(150,55%,32%)] lg:bg-none lg:bg-transparent">
      {/* Hero panel — right side in RTL */}
      <div className="relative hidden flex-1 flex-col justify-center overflow-hidden bg-gradient-to-br from-[hsl(150,55%,18%)] to-[hsl(150,55%,32%)] p-12 lg:flex">
        <div className="absolute inset-0 opacity-5">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative max-w-md">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-5xl backdrop-blur">
              🍄
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">صوبة الماشروم</h1>
              <p className="text-sm text-white/60">نظام الإدارة المتكامل</p>
            </div>
          </div>
          <p className="text-xl leading-relaxed text-white/80">
            أدر صوبتك بكفاءة — من الدورات والعمليات اليومية حتى المبيعات
            والتقارير المالية.
          </p>
          <div className="mt-8 flex gap-6 text-white/40 text-sm">
            <span>المبيعات والعهدة</span>
            <span>•</span>
            <span>التقارير المالية</span>
            <span>•</span>
            <span>إدارة المخزن</span>
          </div>
        </div>

        <p className="absolute bottom-8 right-12 text-xs text-white/20">
          © {new Date().getFullYear()} صوبة الماشروم
        </p>
      </div>

      {/* Form panel — left side in RTL */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-[480px] lg:shrink-0 lg:bg-background">
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-3xl text-primary-foreground">
            🍄
          </div>
          <h1 className="text-xl font-bold">صوبة الماشروم</h1>
        </div>

        <div className="w-full max-w-sm rounded-2xl bg-white/10 p-8 shadow-2xl backdrop-blur-md lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
          <div className="mb-8 lg:hidden">
            <h2 className="text-2xl font-bold tracking-tight text-white">إنشاء حساب جديد</h2>
            <p className="mt-1 text-sm text-white/60">
              سجّل بياناتك للبدء في استخدام النظام
            </p>
          </div>
          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-bold tracking-tight">إنشاء حساب جديد</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              سجّل بياناتك للبدء في استخدام النظام
            </p>
          </div>

          <SignupForm hasGoogle={hasGoogle} />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
