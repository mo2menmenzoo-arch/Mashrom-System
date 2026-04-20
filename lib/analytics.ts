import { prisma } from "@/lib/db";
import { getAllCyclesPnL, type CyclePnL } from "@/lib/reports";

export type CycleEnvAvg = {
  cycleId: string;
  cycleNumber: number;
  avgTemp: number | null;
  avgHumidity: number | null;
};

export type AnalyticsData = {
  pnl: CyclePnL[];
  env: CycleEnvAvg[];
};

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const [pnl, cycles] = await Promise.all([
    getAllCyclesPnL(),
    prisma.cycle.findMany({
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        readings: {
          select: { temperature: true, humidity: true },
        },
      },
    }),
  ]);

  const env: CycleEnvAvg[] = cycles.map((c) => {
    const temps = c.readings
      .map((r) => (r.temperature ? Number(r.temperature) : null))
      .filter((v): v is number => v !== null);
    const humids = c.readings
      .map((r) => (r.humidity ? Number(r.humidity) : null))
      .filter((v): v is number => v !== null);

    return {
      cycleId: c.id,
      cycleNumber: c.number,
      avgTemp:
        temps.length > 0
          ? Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1))
          : null,
      avgHumidity:
        humids.length > 0
          ? Number((humids.reduce((a, b) => a + b, 0) / humids.length).toFixed(1))
          : null,
    };
  });

  return { pnl, env };
}
