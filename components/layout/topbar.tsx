import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEGP } from "@/lib/format";
import { logoutAction } from "@/actions/auth";
import type { Role } from "@prisma/client";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "مدير",
  OPERATOR: "مشغّل",
  ACCOUNTANT: "محاسب",
  VIEWER: "مراقب",
};

export function Topbar({
  userName,
  role,
  custodyBalance,
  onMenuClick,
}: {
  userName: string;
  role: Role;
  custodyBalance: number;
  onMenuClick?: () => void;
}) {
  const low = custodyBalance < 1000;
  const initials = userName.trim().slice(0, 2) || "م";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 shadow-sm backdrop-blur md:px-6">
      {/* Left side: hamburger (mobile) + custody balance */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-btn"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
          aria-label="فتح القائمة"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">رصيد العهدة:</span>
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
      </div>

      {/* Right side: user info + logout */}
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
            <span className="hidden sm:inline">خروج</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
