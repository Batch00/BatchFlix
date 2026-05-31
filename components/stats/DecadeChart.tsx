"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DecadeCount, StatsItem } from "@/lib/queries/stats";

type Props = {
  data: DecadeCount[];
  allItems?: StatsItem[];
  onDrillDown?: (title: string, items: StatsItem[]) => void;
};

function decadeLabel(decade: number): string {
  return `${decade}s`;
}

export function DecadeChart({ data, allItems, onDrillDown }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = data.map((d) => ({
    ...d,
    label: decadeLabel(d.decade),
  }));

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        By Decade
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#111111",
              border: "1px solid #1f1f1f",
              borderRadius: "8px",
              color: "#f9fafb",
              fontSize: "12px",
            }}
            formatter={(value) => [value, "titles"]}
            labelFormatter={(label) => `${label}`}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            cursor={onDrillDown ? "pointer" : undefined}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={(barData: unknown) => {
              if (!onDrillDown || !allItems) return;
              const decade = (barData as { decade: number }).decade;
              const matches = allItems.filter((item) => {
                if (!item.release_date) return false;
                const year = +item.release_date.slice(0, 4);
                return Math.floor(year / 10) * 10 === decade;
              });
              onDrillDown(`${decade}s`, matches);
            }}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === activeIndex ? "#9333ea" : "#7c3aed"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
