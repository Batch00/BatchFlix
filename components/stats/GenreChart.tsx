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
import { normalizeGenre } from "@/lib/queries/stats";
import type { GenreCount, StatsItem } from "@/lib/queries/stats";

type Props = {
  data: GenreCount[];
  allItems?: StatsItem[];
  onDrillDown?: (title: string, items: StatsItem[]) => void;
};

export function GenreChart({ data, allItems, onDrillDown }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Top Genres
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        >
          <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fill: "#9ca3af", fontSize: 12 }}
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
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            cursor={onDrillDown ? "pointer" : undefined}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={(barData: unknown) => {
              if (!onDrillDown || !allItems) return;
              const genre = (barData as GenreCount).name;
              const matches = allItems.filter((item) =>
                item.genres.some((g) => normalizeGenre(g.name) === genre)
              );
              onDrillDown(genre, matches);
            }}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === activeIndex ? "#3b82f6" : "#2563EB"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
