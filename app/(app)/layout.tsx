import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCustodyBalance } from "@/lib/custody";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");

  const custodyBalance = await getCustodyBalance();

  return (
    <div className="flex min-h-screen">
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
