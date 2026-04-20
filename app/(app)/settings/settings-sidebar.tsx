// app/(app)/settings/settings-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Leaf, DollarSign, Settings, Users, Bell, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/settings/account",      icon: User,         label: "الحساب" },
  { href: "/settings/greenhouse",   icon: Leaf,         label: "إعدادات الصوبة" },
  { href: "/settings/financial",    icon: DollarSign,   label: "المالية" },
  { href: "/settings/system",       icon: Settings,     label: "النظام والبيانات" },
  { href: "/settings/partners",     icon: PieChart,     label: "توزيع الأرباح" },
  { href: "/settings/users",        icon: Users,        label: "المستخدمون" },
  { href: "/settings/notifications",icon: Bell,         label: "الإشعارات" },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          الإعدادات
        </p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
