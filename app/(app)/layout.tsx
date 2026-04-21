import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ThemeSync } from "@/components/theme-sync";
import { getCustodyBalance } from "@/lib/custody";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");

  const [custodyBalance, prefs] = await Promise.all([
    getCustodyBalance(),
    prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
      select: { theme: true },
    }),
  ]);

  const theme = (prefs?.theme === "dark" ? "dark" : "light") as "light" | "dark";

  return (
    <div className="flex min-h-screen">
      <ThemeSync theme={theme} />
      <Sidebar role={session.user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={session.user.name ?? session.user.email ?? ""}
          role={session.user.role}
          custodyBalance={custodyBalance}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
