import { notFound } from "next/navigation";
import { Clapperboard, Eye, Clock, Star, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStatsData, parseTimeRange } from "@/lib/queries/stats";
import { TimeRangeSelector } from "@/components/stats/TimeRangeSelector";
import { KPICard } from "@/components/stats/KPICard";
import { GenreChart } from "@/components/stats/GenreChart";
import { DecadeChart } from "@/components/stats/DecadeChart";
import { RatingDistributionChart } from "@/components/stats/RatingDistributionChart";
import { MonthlyHeatmap } from "@/components/stats/MonthlyHeatmap";
import { TopRatedList } from "@/components/stats/TopRatedList";

type SearchParams = Promise<{ range?: string }>;

export default async function StatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { range: rawRange } = await searchParams;
  const range = parseTimeRange(rawRange);
  const rangeKey = rawRange ?? "lifetime";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const stats = await getStatsData(supabase, user.id, range);

  const hoursWatched = Math.round(stats.totalMinutes / 60);
  const avgRatingDisplay =
    stats.avgRating !== null
      ? (stats.avgRating / 2).toFixed(1) + " / 5"
      : "-- / 5";

  const isEmpty = stats.watchedCount === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-foreground">Stats</h1>

        <TimeRangeSelector current={rangeKey} />

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
            <Clapperboard className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No watch history for this period.
            </p>
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
      </div>
    </div>
  );
}
