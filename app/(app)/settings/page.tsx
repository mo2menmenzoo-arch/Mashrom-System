import Link from "next/link";
import { Users, Bell, ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/settings/users",
    icon: Users,
    title: "إدارة المستخدمين",
    description:
      "إضافة المستخدمين وتعديل أدوارهم وتفعيل أو تعطيل حساباتهم.",
  },
  {
    href: "/settings/notifications",
    icon: Bell,
    title: "الإشعارات",
    description: "تفعيل أو تعطيل إشعارات المتصفح للتنبيهات المهمة.",
  },
];

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">
          إدارة المستخدمين والإشعارات وإعدادات النظام
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="cursor-pointer transition-colors hover:bg-muted/50 h-full">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardHeader>
                <CardContent>
                  <CardDescription>{s.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
