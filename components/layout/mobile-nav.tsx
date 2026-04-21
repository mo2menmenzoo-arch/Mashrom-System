"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X,
  LayoutDashboard, RefreshCw, ShoppingCart, Receipt,
  Thermometer, Package, Wallet, FileBarChart, LineChart,
  Search, Settings, Users, PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

const SECTIONS = [
  {
    label: "القائمة الرئيسية",
    items: [
      { href: "/dashboard",   label: "الرئيسية",        icon: LayoutDashboard },
      { href: "/cycles",      label: "الدورات",          icon: RefreshCw },
      { href: "/sales",       label: "المبيعات",         icon: ShoppingCart },
      { href: "/expenses",    label: "مصاريف التشغيل",   icon: Receipt },
      { href: "/operations",  label: "جدول التشغيل",     icon: Thermometer },
      { href: "/inventory",   label: "المخزن",           icon: Package },
      { href: "/custody",     label: "العهدة",           icon: Wallet },
      { href: "/reports",     label: "التقارير",         icon: FileBarChart },
      { href: "/analytics",   label: "التحليل البياني",  icon: LineChart },
      { href: "/search",      label: "البحث",            icon: Search },
    ],
  },
  {
    label: "الإدارة",
    roles: ["ADMIN"] as Role[],
    items: [
      { href: "/team",     label: "المستخدمون", icon: Users,    roles: ["ADMIN"] as Role[] },
      { href: "/partners", label: "الشركاء",    icon: PieChart, roles: ["ADMIN"] as Role[] },
      { href: "/settings", label: "الإعدادات",  icon: Settings, roles: ["ADMIN"] as Role[] },
    ],
  },
];

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
        aria-label="فتح القائمة"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 bg-card shadow-2xl transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Drawer header */}
        <div className="flex h-16 items-center justify-between border-b px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-xl">
              🍄
            </span>
            <div>
              <span className="block font-bold leading-tight">صوبة الماشروم</span>
              <span className="block text-[10px] text-muted-foreground">نظام الإدارة</span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-4 overflow-y-auto p-3 pb-8" style={{ maxHeight: "calc(100vh - 4rem)" }}>
          {SECTIONS.map((section) => {
            if (section.roles && !section.roles.includes(role)) return null;
            const visibleItems = section.items.filter(
              (i) => !i.roles || i.roles.includes(role),
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.label}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {section.label}
                </p>
                <div className="flex flex-col gap-1">
                  {visibleItems.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/settings" && pathname?.startsWith(item.href + "/"));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "border-r-2 border-primary bg-primary/8 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}
