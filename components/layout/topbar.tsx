import { LogOut, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">رصيد العهدة:</span>
        <Badge variant={low ? "warning" : "success"} className="tabular-nums">
          {formatEGP(custodyBalance)}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <UserCircle className="h-5 w-5 text-muted-foreground" />
          <span>{userName}</span>
          <Badge variant="secondary">{ROLE_LABEL[role]}</Badge>
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
