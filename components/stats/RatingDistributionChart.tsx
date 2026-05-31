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
import type { RatingCount, StatsItem } from "@/lib/queries/stats";

type Props = {
  data: RatingCount[];
  allItems?: StatsItem[];
  onDrillDown?: (title: string, items: StatsItem[]) => void;
};

const ALL_RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function ratingLabel(r: number): string {
  return (r / 2).toFixed(1);
}

function barColor(index: number, total: number): string {
  const t = total > 1 ? index / (total - 1) : 0;
  const r = Math.round(0x25 + t * (0x7c - 0x25));
  const g = Math.round(0x63 + t * (0x3a - 0x63));
  const b = Math.round(0xeb + t * (0xed - 0xeb));
  return `rgb(${r},${g},${b})`;
}

export function RatingDistributionChart({ data, allItems, onDrillDown }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const countMap = new Map(data.map((d) => [d.rating, d.count]));

  const chartData = ALL_RATINGS.map((r) => ({
    rating: r,
    label: ratingLabel(r),
    count: countMap.get(r) ?? 0,
  }));

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Rating Distribution
      </h3>
      <ResponsiveContainer width="100%" height={220}>
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
            allowDecimals={false}
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
            labelFormatter={(label) => `Rating: ${label}`}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            cursor={onDrillDown ? "pointer" : undefined}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={(barData: unknown) => {
              if (!onDrillDown || !allItems) return;
              const ratingValue = (barData as { rating: number }).rating;
              const displayValue = (ratingValue / 2).toFixed(1);
              const matches = allItems.filter((item) => item.rating === ratingValue);
              onDrillDown(`Rated ${displayValue} Stars`, matches);
            }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${entry.rating}`}
                fill={barColor(index, chartData.length)}
                style={
                  index === activeIndex
                    ? { filter: "brightness(1.35)" }
                    : undefined
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
