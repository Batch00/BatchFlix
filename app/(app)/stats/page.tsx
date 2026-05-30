import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BarChart2, Clock, Eye, Film, Star } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStatsData, parseTimeRange } from "@/lib/queries/stats";
import { TimeRangeSelector } from "@/components/stats/TimeRangeSelector";
import { KPICard } from "@/components/stats/KPICard";
import { GenreChart } from "@/components/stats/GenreChart";
import { DecadeChart } from "@/components/stats/DecadeChart";
import { RatingDistributionChart } from "@/components/stats/RatingDistributionChart";
import { MonthlyHeatmap } from "@/components/stats/MonthlyHeatmap";
import { TopRatedList } from "@/components/stats/TopRatedList";
import { StatsSkeleton } from "@/components/skeletons/StatsSkeleton";

export const metadata: Metadata = { title: "Stats" };

type SearchParams = Promise<{ range?: string }>;

async function StatsData({
  userId,
  rangeKey,
}: {
  userId: string;
  rangeKey: string;
}) {
  const supabase = await createClient();
  const range = parseTimeRange(rangeKey === "lifetime" ? undefined : rangeKey);
  const stats = await getStatsData(supabase, userId, range);

  const hoursWatched = Math.round(stats.totalMinutes / 60);
  const avgRatingDisplay =
    stats.avgRating !== null
      ? (stats.avgRating / 2).toFixed(1) + " / 5"
      : "-- / 5";

  const isEmpty = stats.watchedCount === 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="Total Tracked"
          value={String(stats.totalCount)}
          icon={Film}
        />
        <KPICard
          label="Watched"
          value={String(stats.watchedCount)}
          icon={Eye}
        />
        <KPICard
          label="Hours Watched"
          value={`${hoursWatched} hrs`}
          icon={Clock}
        />
        <KPICard
          label="Avg Rating"
          value={avgRatingDisplay}
          icon={Star}
        />
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
              <GenreChart data={stats.genreCounts} />
            </div>
            <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
              <DecadeChart data={stats.decadeCounts} />
            </div>
          </div>

          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
            <RatingDistributionChart data={stats.ratingDistribution} />
          </div>

          <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
            <MonthlyHeatmap data={stats.monthlyWatched} range={range} />
          </div>

          {stats.topRated.length > 0 && (
            <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Top Rated
              </h3>
              <TopRatedList items={stats.topRated} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { range: rawRange } = await searchParams;
  const rangeKey = rawRange ?? "lifetime";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-foreground">Stats</h1>
        <TimeRangeSelector current={rangeKey} />

        <Suspense fallback={<StatsSkeleton />}>
          <StatsData userId={user.id} rangeKey={rangeKey} />
        </Suspense>
      </div>
    </div>
  );
}
