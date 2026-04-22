// app/(app)/settings/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SettingsSidebar } from "./settings-sidebar";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex flex-col gap-0 md:flex-row md:gap-8">
      <SettingsSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
