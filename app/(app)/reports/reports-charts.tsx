"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { CyclePnL } from "@/lib/reports";

// ─── helpers ────────────────────────────────────────────────────────────────

function egp(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── All-cycles bar chart ────────────────────────────────────────────────────

type BarDatum = {
  name: string;
  إيرادات: number;
  مصاريف: number;
  "صافي الربح": number;
};

const BAR_COLORS = {
  إيرادات: "hsl(142 76% 36%)",
  مصاريف: "hsl(0 72% 51%)",
  "صافي الربح": "hsl(217 91% 60%)",
};

export function CyclesPnLChart({ cycles }: { cycles: CyclePnL[] }) {
  const data: BarDatum[] = cycles.map((c) => ({
    name: `د${c.cycleNumber}`,
    إيرادات: c.revenue,
    مصاريف: c.expenses + c.custody,
    "صافي الربح": c.net,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(v) => egp(v)}
          tick={{ fontSize: 11 }}
          width={90}
          reversed={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => [egp(value), name]}
          contentStyle={{ direction: "rtl", textAlign: "right" }}
        />
        <Legend wrapperStyle={{ direction: "rtl" }} />
        <Bar dataKey="إيرادات" fill={BAR_COLORS["إيرادات"]} radius={[3, 3, 0, 0]} />
        <Bar dataKey="مصاريف" fill={BAR_COLORS["مصاريف"]} radius={[3, 3, 0, 0]} />
        <Bar dataKey="صافي الربح" fill={BAR_COLORS["صافي الربح"]} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Single-cycle donut chart ────────────────────────────────────────────────

const PIE_COLORS = [
  "hsl(0 72% 51%)",   // مصاريف التشغيل
  "hsl(38 92% 50%)",  // مصاريف العهدة
  "hsl(142 76% 36%)", // صافي الربح
];

export function CycleBreakdownChart({ pnl }: { pnl: CyclePnL }) {
  const total = pnl.revenue;
  if (total <= 0) return null;

  const data = [
    { name: "مصاريف التشغيل", value: pnl.expenses },
    { name: "مصاريف العهدة", value: pnl.custody },
    { name: "صافي الربح", value: Math.max(0, pnl.net) },
  ].filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}٪`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [egp(value), name]}
          contentStyle={{ direction: "rtl", textAlign: "right" }}
        />
        <Legend wrapperStyle={{ direction: "rtl" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
