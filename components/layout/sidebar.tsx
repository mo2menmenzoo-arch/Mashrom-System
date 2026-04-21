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
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
};

type NavSection = {
  label: string;
  roles?: Role[];
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    label: "القائمة الرئيسية",
    items: [
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
    ],
  },
  {
    label: "الإدارة",
    roles: ["ADMIN"],
    items: [
      { href: "/team", label: "المستخدمون", icon: Users, roles: ["ADMIN"] },
      { href: "/partners", label: "الشركاء", icon: PieChart, roles: ["ADMIN"] },
      { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["ADMIN"] },
    ],
  },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-l bg-card md:block">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          🍄
        </span>
        <span className="font-bold">صوبة الماشروم</span>
      </div>
      <nav className="flex flex-col gap-4 p-3">
        {SECTIONS.map((section) => {
          if (section.roles && !section.roles.includes(role)) return null;
          const visibleItems = section.items.filter(
            (i) => !i.roles || i.roles.includes(role),
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label}>
              <p className="mb-1 px-3 text-xs font-semibold text-muted-foreground">
                {section.label}
              </p>
              <div className="flex flex-col gap-1">
                {visibleItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/settings" &&
                      pathname?.startsWith(item.href + "/"));
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
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
