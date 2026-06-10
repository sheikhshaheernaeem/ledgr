"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface CategoryData {
  category: string;
  amount: number;
}

const fmt = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

export function MonthlyBarChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) return (
    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
  );
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} className="fill-muted-foreground" width={52} />
        <Tooltip
          formatter={(value, name) => [
            `$${Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            name === "income" ? "Income" : name === "expenses" ? "Expenses" : "Net Profit",
          ]}
          contentStyle={{ fontSize: 12, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) return (
    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No expense data yet</div>
  );
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={140} />
        <Tooltip
          formatter={(value) => [`$${Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`]}
          contentStyle={{ fontSize: 12, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
        />
        <Bar dataKey="amount" name="Amount" fill="#10b981" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
