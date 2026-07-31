"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { BarChart2, Clock, Eye, Film, Star } from "lucide-react";
import Link from "next/link";
import { KPICard } from "./KPICard";
import { MonthlyHeatmap } from "./MonthlyHeatmap";
import { TopRatedList } from "./TopRatedList";
import type { StatsData, StatsItem, TimeRange } from "@/lib/queries/stats";

// Recharts pulls in d3 + victory-vendor + redux (~104 kB gzip). It is only
// needed here and every chart sits below the KPI row, so load it lazily
// behind a fixed-height skeleton that reserves the same space.
const ChartSkeleton = () => (
  <div className="h-[300px] animate-pulse rounded-lg bg-[#1f1f1f]" />
);

const GenreChart = dynamic(
  () => import("./GenreChart").then((m) => m.GenreChart),
  { ssr: false, loading: ChartSkeleton }
);
const DecadeChart = dynamic(
  () => import("./DecadeChart").then((m) => m.DecadeChart),
  { ssr: false, loading: ChartSkeleton }
);
const RatingDistributionChart = dynamic(
  () => import("./RatingDistributionChart").then((m) => m.RatingDistributionChart),
  { ssr: false, loading: ChartSkeleton }
);

// Drill-down drawer: invisible until a chart is clicked, so nothing to reserve.
const StatsDrawer = dynamic(
  () => import("./StatsDrawer").then((m) => m.StatsDrawer),
  { ssr: false }
);

type Props = {
  stats: StatsData;
  range: TimeRange;
  rangeLabel: string;
};

export function StatsPageClient({ stats, range, rangeLabel }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerItems, setDrawerItems] = useState<StatsItem[]>([]);

  // Only mount the drawer once something has been drilled into, so its chunk
  // is never fetched on a visit that does not use it.
  const [drawerMounted, setDrawerMounted] = useState(false);

  const onDrillDown = useCallback((title: string, items: StatsItem[]) => {
    setDrawerTitle(title);
    setDrawerItems(items);
    setDrawerMounted(true);
    setDrawerOpen(true);
  }, []);

  const hoursWatched = Math.round(stats.totalMinutes / 60);
  const avgRatingDisplay =
    stats.avgRating !== null
      ? (stats.avgRating / 2).toFixed(1) + " / 5"
      : "-- / 5";

  const isEmpty = stats.watchedCount === 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Total Tracked" value={String(stats.totalCount)} icon={Film} />
        <KPICard label="Watched" value={String(stats.watchedCount)} icon={Eye} />
        <KPICard label="Hours Watched" value={`${hoursWatched} hrs`} icon={Clock} />
        <KPICard label="Avg Rating" value={avgRatingDisplay} icon={Star} />
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BarChart2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold text-foreground">
            No watch history yet
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Start tracking what you watch to see your stats here.
          </p>
          <Link
            href="/library"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
          >
            Go to Library
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
              <GenreChart
                data={stats.genreCounts}
                allItems={stats.allItems}
                onDrillDown={onDrillDown}
              />
            </div>
            <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
              <DecadeChart
                data={stats.decadeCounts}
                allItems={stats.allItems}
                onDrillDown={onDrillDown}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
            <RatingDistributionChart
              data={stats.ratingDistribution}
              allItems={stats.allItems}
              onDrillDown={onDrillDown}
            />
          </div>

          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
            <MonthlyHeatmap
              data={stats.monthlyWatched}
              range={range}
              allItems={stats.allItems}
              onDrillDown={onDrillDown}
            />
          </div>

          {stats.topRated.length > 0 && (
            <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
              <TopRatedList
                items={stats.topRated}
                allItems={stats.allItems}
                onDrillDown={onDrillDown}
              />
            </div>
          )}
        </div>
      )}

      {drawerMounted && (
        <StatsDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={drawerTitle}
          items={drawerItems}
          timeRangeLabel={rangeLabel}
        />
      )}
    </>
  );
}
