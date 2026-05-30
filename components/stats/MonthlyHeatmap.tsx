"use client";

import type { MonthlyCount, TimeRange } from "@/lib/queries/stats";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type MonthCell = { year: number; month: number; label: string; count: number };

function getMonthsToShow(range: TimeRange): Array<{ year: number; month: number }> {
  if (range.type === "year") {
    return Array.from({ length: 12 }, (_, i) => ({
      year: range.year,
      month: i + 1,
    }));
  }
  // lifetime or last12months: last 12 months from now
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

type Props = {
  data: MonthlyCount[];
  range: TimeRange;
};

export function MonthlyHeatmap({ data, range }: Props) {
  const countMap = new Map(
    data.map((d) => [`${d.year}-${d.month}`, d.count])
  );

  const months = getMonthsToShow(range);
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  const cells: MonthCell[] = months.map(({ year, month }) => ({
    year,
    month,
    label: MONTH_LABELS[month - 1],
    count: countMap.get(`${year}-${month}`) ?? 0,
  }));

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Monthly Activity
      </h3>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
        {cells.map((cell) => {
          const intensity = cell.count === 0 ? 0 : cell.count / maxCount;
          const bg = cell.count === 0 ? "#1f1f1f" : undefined;
          const blueOpacity = Math.round(intensity * 100);

          return (
            <div
              key={`${cell.year}-${cell.month}`}
              className="flex flex-col items-center gap-1 rounded-lg p-2"
              style={{
                backgroundColor:
                  bg ??
                  `color-mix(in srgb, #2563EB ${blueOpacity}%, #1f1f1f)`,
              }}
            >
              <span className="text-[10px] text-muted-foreground">
                {cell.label}
              </span>
              <span className="text-sm font-medium text-foreground">
                {cell.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
