import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEGP } from "@/lib/format";
import { logoutAction } from "@/actions/auth";
import type { Role } from "@prisma/client";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "مدير",
  OPERATOR: "مشغّل",
  ACCOUNTANT: "محاسب",
};

export function Topbar({
  userName,
  role,
  custodyBalance,
}: {
  userName: string;
  role: Role;
  custodyBalance: number;
}) {
  const low = custodyBalance < 1000;
  const initials = userName.trim().slice(0, 2) || "م";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-6 shadow-sm backdrop-blur">
      {/* Custody balance */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">رصيد العهدة:</span>
        <span
          className={`rounded-full border px-3 py-0.5 text-sm font-semibold tabular-nums ${
            low
              ? "border-warning/30 bg-warning/15 text-warning"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          {formatEGP(custodyBalance)}
        </span>
      </div>

      {/* User info + logout */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="hidden text-sm sm:block">
            <span className="font-medium">{userName}</span>
            <span className="mr-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
        <form action={logoutAction}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </form>
      </div>
    </header>
  );
}
