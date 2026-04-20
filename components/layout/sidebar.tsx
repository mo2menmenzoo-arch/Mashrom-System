"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  RefreshCw,
  ShoppingCart,
  Receipt,
  Thermometer,
  Package,
  Wallet,
  FileBarChart,
  LineChart,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[]; // visible to these roles; if omitted, all
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/cycles", label: "الدورات", icon: RefreshCw },
  { href: "/sales", label: "المبيعات", icon: ShoppingCart },
  { href: "/expenses", label: "مصاريف التشغيل", icon: Receipt },
  { href: "/operations", label: "جدول التشغيل", icon: Thermometer },
  { href: "/inventory", label: "المخزن", icon: Package },
  { href: "/custody", label: "العهدة", icon: Wallet },
  { href: "/reports", label: "التقارير", icon: FileBarChart },
  { href: "/analytics", label: "التحليل البياني", icon: LineChart },
  { href: "/search", label: "البحث", icon: Search },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["ADMIN"] },
  { href: "/settings/users", label: "إدارة المستخدمين", icon: Users, roles: ["ADMIN"] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <aside className="hidden w-64 shrink-0 border-l bg-card md:block">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          🍄
        </span>
        <span className="font-bold">صوبة الماشروم</span>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/settings" && pathname?.startsWith(item.href + "/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
