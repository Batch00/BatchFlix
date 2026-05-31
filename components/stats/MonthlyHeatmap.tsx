"use client";

import type { MonthlyCount, TimeRange, StatsItem } from "@/lib/queries/stats";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type MonthCell = { year: number; month: number; label: string; count: number };

function getMonthsToShow(range: TimeRange): Array<{ year: number; month: number }> {
  if (range.type === "year") {
    return Array.from({ length: 12 }, (_, i) => ({
      year: range.year,
      month: i + 1,
    }));
  }
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

type Props = {
  data: MonthlyCount[];
  range: TimeRange;
  allItems?: StatsItem[];
  onDrillDown?: (title: string, items: StatsItem[]) => void;
};

export function MonthlyHeatmap({ data, range, allItems, onDrillDown }: Props) {
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

  function handleCellClick(cell: MonthCell) {
    if (!onDrillDown || !allItems) return;
    const matches = allItems.filter((item) => {
      if (!item.watched_date) return false;
      const dateStr = item.watched_date.split("T")[0];
      const parts = dateStr.split("-");
      return parseInt(parts[0]) === cell.year && parseInt(parts[1]) === cell.month;
    });
    const label = `${MONTH_NAMES_FULL[cell.month - 1]} ${cell.year}`;
    onDrillDown(label, matches);
  }

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
            <button
              key={`${cell.year}-${cell.month}`}
              type="button"
              onClick={() => handleCellClick(cell)}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg p-2 transition-all hover:ring-1 hover:ring-[#2563EB]/60"
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
