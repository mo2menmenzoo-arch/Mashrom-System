import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotificationsToggle } from "./notifications-toggle";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إعدادات الإشعارات</h1>
        <p className="text-sm text-muted-foreground">
          تفعيل إشعارات المتصفح لتلقي تنبيهات مهمة من النظام
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">إشعارات المتصفح</CardTitle>
            <CardDescription>
              تنبيهات فورية لرصيد العهدة المنخفض والأحداث المهمة
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <NotificationsToggle />
        </CardContent>
      </Card>
    </div>
  );
}
