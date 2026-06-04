import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/ui/BackButton";
import { KeywordResultsClient } from "@/components/media/KeywordResultsClient";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ name?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { name } = await searchParams;
  return { title: name ?? "Keywords" };
}

type LibMapRow = {
  status: string;
  user_media_id: string;
  media_items: { tmdb_id: number; media_type: string } | null;
};

type TMDBItem = {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type: "movie" | "tv";
};

async function KeywordData({
  keywordId,
  keywordName,
  userId,
}: {
  keywordId: string;
  keywordName: string;
  userId: string | null;
}) {
  const [moviesRes, tvRes] = await Promise.all([
    fetch(
      `https://api.themoviedb.org/3/keyword/${keywordId}/movies?page=1`,
      {
        headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
        next: { revalidate: 3600 },
      }
    ),
    fetch(
      `https://api.themoviedb.org/3/discover/tv?with_keywords=${keywordId}&sort_by=vote_average.desc&page=1`,
      {
        headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
        next: { revalidate: 3600 },
      }
    ),
  ]);

  const moviesData = moviesRes.ok ? (await moviesRes.json() as { results?: TMDBItem[] }) : { results: [] };
  const tvData = tvRes.ok ? (await tvRes.json() as { results?: TMDBItem[] }) : { results: [] };

  const movies: TMDBItem[] = (moviesData.results ?? [])
    .slice(0, 20)
    .map((m) => ({ ...m, media_type: "movie" as const }));
  const tvShows: TMDBItem[] = (tvData.results ?? [])
    .slice(0, 20)
    .map((t) => ({ ...t, media_type: "tv" as const }));

  const libraryMap: Record<string, { status: string; userMediaId: string }> = {};
  if (userId) {
    const supabase = await createClient();
    const { data: libRows } = await supabase
      .schema("batchflix")
      .from("user_media")
      .select("id, status, media_items(tmdb_id, media_type)")
      .eq("user_id", userId);

    for (const row of (libRows ?? []) as unknown as Array<{
      id: string;
      status: string;
      media_items: { tmdb_id: number; media_type: string } | null;
    }>) {
      const mi = row.media_items;
      if (mi) {
        libraryMap[`${mi.tmdb_id}-${mi.media_type}`] = {
          status: row.status,
          userMediaId: row.id,
        };
      }
    }
  }

  return (
    <KeywordResultsClient
      keywordName={keywordName}
      movies={movies}
      tvShows={tvShows}
      initialLibraryMap={libraryMap}
    />
  );
}

export default async function KeywordPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { name = "Keyword" } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 md:px-6">
      <BackButton />
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <KeywordData
          keywordId={id}
          keywordName={name}
          userId={user?.id ?? null}
        />
      </Suspense>
    </div>
  );
}
