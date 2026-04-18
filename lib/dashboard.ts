import { addDays, startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { getCyclePnL, type CyclePnL } from "@/lib/reports";
import { getCustodyBalance } from "@/lib/custody";
import { cycleDayNumber, cycleProgress, CYCLE_LENGTH_DAYS } from "@/lib/cycle";

export type DashboardAlert = {
  id: string;
  level: "warning" | "destructive" | "default";
  message: string;
  href?: string;
};

export type DashboardData = {
  activeCycle:
    | {
        id: string;
        number: number;
        startDate: Date;
        endDate: Date;
        dayNumber: number;
        progressPct: number;
        pnl: CyclePnL;
      }
    | null;
  custodyBalance: number;
  alerts: DashboardAlert[];
  todayReading: {
    exists: boolean;
    cycleId: string | null;
  };
};

export async function getDashboardData(): Promise<DashboardData> {
  const activeCycle = await prisma.cycle.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  const custodyBalance = await getCustodyBalance();
  const alerts: DashboardAlert[] = [];

  if (!activeCycle) {
    return {
      activeCycle: null,
      custodyBalance,
      alerts: [
        {
          id: "no-active-cycle",
          level: "warning",
          message: "لا توجد دورة إنتاج نشطة حالياً — أنشئ دورة جديدة للبدء.",
          href: "/cycles",
        },
      ],
      todayReading: { exists: false, cycleId: null },
    };
  }

  const pnl = await getCyclePnL(activeCycle.id);
  const dayNumber = cycleDayNumber(activeCycle.startDate);
  const progressPct = cycleProgress(activeCycle.startDate);

  // Unpaid balance alert
  if (pnl.totalUnpaid > 0) {
    alerts.push({
      id: "unpaid-balance",
      level: "warning",
      message: `مبالغ غير مدفوعة بإجمالي ${pnl.totalUnpaid.toFixed(2)} ج.م`,
      href: "/sales",
    });
  }

  // Low custody alert
  if (custodyBalance < 1000) {
    alerts.push({
      id: "low-custody",
      level: "warning",
      message: `رصيد العهدة منخفض: ${custodyBalance.toFixed(2)} ج.م`,
      href: "/custody",
    });
  }

  // Inventory expiring within 7 days
  const weekOut = addDays(new Date(), 7);
  const expiring = await prisma.inventoryItem.count({
    where: {
      cycleId: activeCycle.id,
      expiryDate: { not: null, lte: weekOut, gte: new Date() },
    },
  });
  if (expiring > 0) {
    alerts.push({
      id: "expiring-inventory",
      level: "warning",
      message: `${expiring} صنف يقترب تاريخ انتهاء صلاحيته خلال 7 أيام`,
      href: "/inventory",
    });
  }

  // Today's ops reading missing?
  const today = new Date();
  const reading = await prisma.operationReading.findFirst({
    where: {
      cycleId: activeCycle.id,
      date: { gte: startOfDay(today), lte: endOfDay(today) },
    },
    select: { id: true },
  });
  if (!reading) {
    alerts.push({
      id: "missing-reading",
      level: "default",
      message: "لم تُسجَّل قراءات اليوم (حرارة/رطوبة/CO₂) بعد.",
      href: "/operations",
    });
  }

  return {
    activeCycle: {
      id: activeCycle.id,
      number: activeCycle.number,
      startDate: activeCycle.startDate,
      endDate: activeCycle.endDate,
      dayNumber,
      progressPct,
      pnl,
    },
    custodyBalance,
    alerts,
    todayReading: { exists: !!reading, cycleId: activeCycle.id },
  };
}

export { CYCLE_LENGTH_DAYS };
