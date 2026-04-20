"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CyclePnL } from "@/lib/reports";
import type { CycleEnvAvg } from "@/lib/analytics";

function egp(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Chart 1: Net profit per cycle (Line) ───────────────────────────────────

export function NetProfitChart({ cycles }: { cycles: CyclePnL[] }) {
  const data = cycles.map((c) => ({
    name: `د${c.cycleNumber}`,
    "صافي الربح": c.net,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => egp(v)} tick={{ fontSize: 11 }} width={90} />
        <Tooltip
          formatter={(v: number, name: string) => [egp(v), name]}
          contentStyle={{ direction: "rtl", textAlign: "right" }}
        />
        <Legend wrapperStyle={{ direction: "rtl" }} />
        <Line
          type="monotone"
          dataKey="صافي الربح"
          stroke="hsl(217 91% 60%)"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Chart 2: Expense distribution across ALL cycles (Pie) ──────────────────

const PIE_COLORS = [
  "hsl(0 72% 51%)",
  "hsl(38 92% 50%)",
  "hsl(142 76% 36%)",
];

export function ExpenseDistributionChart({ cycles }: { cycles: CyclePnL[] }) {
  const totalExpenses = cycles.reduce((s, c) => s + c.expenses, 0);
  const totalCustody = cycles.reduce((s, c) => s + c.custody, 0);
  const totalNet = cycles.reduce((s, c) => s + Math.max(0, c.net), 0);

  const data = [
    { name: "مصاريف التشغيل", value: totalExpenses },
    { name: "مصاريف العهدة", value: totalCustody },
    { name: "صافي الربح", value: totalNet },
  ].filter((d) => d.value > 0);

  if (data.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        لا توجد بيانات كافية.
      </p>
    );

  return (
    <ResponsiveContainer width="100%" height={280}>
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
          formatter={(v: number, name: string) => [egp(v), name]}
          contentStyle={{ direction: "rtl", textAlign: "right" }}
        />
        <Legend wrapperStyle={{ direction: "rtl" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Chart 3: Cartons sold per cycle (Bar) ──────────────────────────────────

export function CartonsChart({ cycles }: { cycles: CyclePnL[] }) {
  const data = cycles.map((c) => ({
    name: `د${c.cycleNumber}`,
    كراتين: c.cartonsSold,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} width={60} />
        <Tooltip
          formatter={(v: number, name: string) => [v, name]}
          contentStyle={{ direction: "rtl", textAlign: "right" }}
        />
        <Legend wrapperStyle={{ direction: "rtl" }} />
        <Bar dataKey="كراتين" fill="hsl(142 76% 36%)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Chart 4: Avg temperature + humidity per cycle (dual Line) ──────────────

export function EnvChart({ env }: { env: CycleEnvAvg[] }) {
  const data = env
    .filter((e) => e.avgTemp !== null || e.avgHumidity !== null)
    .map((e) => ({
      name: `د${e.cycleNumber}`,
      "الحرارة °C": e.avgTemp,
      "الرطوبة %": e.avgHumidity,
    }));

  if (data.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        لا توجد قراءات تشغيلية بعد.
      </p>
    );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} width={50} />
        <Tooltip contentStyle={{ direction: "rtl", textAlign: "right" }} />
        <Legend wrapperStyle={{ direction: "rtl" }} />
        <Line
          type="monotone"
          dataKey="الحرارة °C"
          stroke="hsl(0 72% 51%)"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="الرطوبة %"
          stroke="hsl(217 91% 60%)"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
