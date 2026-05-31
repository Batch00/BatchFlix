import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getStatsData, parseTimeRange } from "@/lib/queries/stats";
import { TimeRangeSelector } from "@/components/stats/TimeRangeSelector";
import { StatsPageClient } from "@/components/stats/StatsPageClient";
import { StatsSkeleton } from "@/components/skeletons/StatsSkeleton";

export const metadata: Metadata = { title: "Stats" };

type SearchParams = Promise<{ range?: string }>;

function getRangeLabel(rangeKey: string): string {
  if (rangeKey === "lifetime") return "All Time";
  if (rangeKey === "last12") return "Last 12 Months";
  return rangeKey;
}

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
  const rangeLabel = getRangeLabel(rangeKey);

  return (
    <StatsPageClient stats={stats} range={range} rangeLabel={rangeLabel} />
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
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 md:px-6">
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
