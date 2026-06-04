import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { User, Film, Tv, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeMediaItem,
  getKeyCrew,
  type TMDBMovieDetail,
  type TMDBTVDetail,
  type TMDBCastMember,
  type TMDBCollection,
  type TMDBKeyword,
  type TMDBSeason,
  type KeyCrew,
} from "@/lib/tmdb";
import { getUserMediaByTmdbId } from "@/lib/queries/library";
import { AddToLibrary } from "@/components/library/AddToLibrary";
import { AddToListButton } from "@/components/library/AddToListButton";
import { MediaDetailSkeleton } from "@/components/skeletons/MediaDetailSkeleton";
import { BackButton } from "@/components/ui/BackButton";
import { TrailerSection } from "@/components/media/TrailerSection";
import { StreamingProviders } from "@/components/media/StreamingProviders";
import { RecommendationsSection } from "@/components/media/RecommendationsSection";
import { CollectionSection } from "@/components/media/CollectionSection";
import { SeasonAccordion } from "@/components/media/SeasonAccordion";

type Params = Promise<{ type: string; id: string }>;

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function fetchTMDB(
  type: string,
  id: string
): Promise<TMDBMovieDetail | TMDBTVDetail | null> {
  const url = `https://api.themoviedb.org/3/${type}/${id}?append_to_response=credits,videos,external_ids,watch%2Fproviders,recommendations,keywords`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchCollection(id: number): Promise<TMDBCollection | null> {
  const res = await fetch(`https://api.themoviedb.org/3/collection/${id}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { type, id } = await params;
  if (type !== "movie" && type !== "tv") return {};
  const data = await fetchTMDB(type, id);
  if (!data) return {};
  const title =
    type === "movie"
      ? (data as TMDBMovieDetail).title
      : (data as TMDBTVDetail).name;
  return { title };
}

function CrewGrid({
  keyCrew,
  directorLabel,
}: {
  keyCrew: KeyCrew;
  directorLabel: string;
}) {
  const rows = [
    keyCrew.director ? { label: directorLabel, value: keyCrew.director } : null,
    keyCrew.writers.length > 0
      ? { label: "Written by", value: keyCrew.writers.join(", ") }
      : null,
    keyCrew.cinematographer
      ? { label: "Cinematography", value: keyCrew.cinematographer }
      : null,
    keyCrew.composer ? { label: "Music", value: keyCrew.composer } : null,
    keyCrew.producers.length > 0
      ? { label: "Producers", value: keyCrew.producers.join(", ") }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (!rows.length) return null;

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {row.label}
          </p>
          <p className="text-sm text-foreground">{row.value}</p>
        </div>
      ))}
    </div>
  );
}

type LibMapRow = {
  status: string;
  media_items: { tmdb_id: number; media_type: string } | null;
};

async function MediaDetailData({
  type,
  id,
  userId,
}: {
  type: string;
  id: string;
  userId: string | null;
}) {
  const mediaType = type as "movie" | "tv";

  const [tmdbData, supabase] = await Promise.all([
    fetchTMDB(type, id),
    createClient(),
  ]);

  if (!tmdbData) notFound();

  const normalized = normalizeMediaItem(
    tmdbData as TMDBMovieDetail | TMDBTVDetail,
    mediaType
  );

  const admin = createAdminClient();
  const { data: mediaItem } = await admin
    .schema("batchflix")
    .from("media_items")
    .upsert(normalized, { onConflict: "tmdb_id,media_type" })
    .select("id")
    .single();

  const collectionId =
    mediaType === "movie"
      ? (tmdbData as TMDBMovieDetail).belongs_to_collection?.id ?? null
      : null;

  const [userMedia, collection] = await Promise.all([
    userId && mediaItem
      ? getUserMediaByTmdbId(supabase, userId, normalized.tmdb_id, mediaType)
      : null,
    collectionId ? fetchCollection(collectionId) : null,
  ]);

  const userLibraryMap: Record<string, string> = {};
  if (userId) {
    const { data: libRows } = await supabase
      .schema("batchflix")
      .from("user_media")
      .select("status, media_items(tmdb_id, media_type)")
      .eq("user_id", userId);

    for (const row of (libRows ?? []) as unknown as LibMapRow[]) {
      const mi = row.media_items;
      if (mi) {
        userLibraryMap[`${mi.media_type}:${mi.tmdb_id}`] = row.status;
      }
    }
  }

  const title =
    mediaType === "movie"
      ? (tmdbData as TMDBMovieDetail).title
      : (tmdbData as TMDBTVDetail).name;

  const releaseDate =
    mediaType === "movie"
      ? (tmdbData as TMDBMovieDetail).release_date
      : (tmdbData as TMDBTVDetail).first_air_date;

  const year = releaseDate ? +releaseDate.slice(0, 4) : null;

  const runtime =
    mediaType === "movie"
      ? (tmdbData as TMDBMovieDetail).runtime
      : (tmdbData as TMDBTVDetail).episode_run_time?.[0];

  let keyCrew: KeyCrew;
  if (mediaType === "movie") {
    keyCrew = getKeyCrew((tmdbData as TMDBMovieDetail).credits?.crew ?? []);
  } else {
    const tvCrew = getKeyCrew((tmdbData as TMDBTVDetail).credits?.crew ?? []);
    keyCrew = {
      ...tvCrew,
      director: (tmdbData as TMDBTVDetail).created_by?.[0]?.name ?? null,
    };
  }
  const directorLabel = mediaType === "movie" ? "Director" : "Created by";

  const cast: TMDBCastMember[] = (
    (tmdbData as TMDBMovieDetail | TMDBTVDetail).credits?.cast ?? []
  )
    .slice(0, 10)
    .sort((a, b) => a.order - b.order);

  const videos = tmdbData.videos?.results ?? [];
  const externalIds = tmdbData.external_ids ?? null;
  const watchProviders = tmdbData["watch/providers"]?.results?.US ?? null;
  const homepage = tmdbData.homepage ?? "";
  const productionCompanies = (tmdbData.production_companies ?? []).slice(0, 3);
  const recommendations = tmdbData.recommendations?.results ?? [];

  const rawKeywords: TMDBKeyword[] =
    mediaType === "movie"
      ? ((tmdbData as TMDBMovieDetail).keywords?.keywords ?? [])
      : ((tmdbData as TMDBTVDetail).keywords?.results ?? []);
  const keywords = rawKeywords.slice(0, 10);

  const tvSeasons: TMDBSeason[] =
    mediaType === "tv"
      ? ((tmdbData as TMDBTVDetail).seasons ?? []).filter(
          (s) => s.season_number > 0
        )
      : [];

  type TVProgressRow = {
    season_number: number;
    episode_number: number;
    watched: boolean;
    watched_date: string | null;
    rating: number | null;
  };
  let tvProgress: TVProgressRow[] = [];
  if (userId && mediaItem && mediaType === "tv") {
    try {
      const { data } = await supabase
        .schema("batchflix")
        .from("tv_progress")
        .select("season_number, episode_number, watched, watched_date, rating")
        .eq("user_id", userId)
        .eq("media_id", mediaItem.id);
      tvProgress = (data ?? []) as TVProgressRow[];
    } catch {
      // tv_progress table may not exist yet
    }
  }

  const backdropPath = tmdbData.backdrop_path;
  const posterPath = tmdbData.poster_path;

  return (
    <div className="min-h-screen bg-background -mt-4">
      <BackButton />

      {/* Backdrop */}
      <div className="relative h-[180px] w-full overflow-hidden sm:h-[220px] md:h-[320px]">
        {backdropPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w1280${backdropPath}`}
            alt={title}
            fill
            className="object-cover object-top"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-secondary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 md:px-6">
        {/* Poster + details row */}
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          {/* Poster */}
          <div className="relative -mt-16 h-[210px] w-[140px] flex-shrink-0 overflow-hidden rounded-lg shadow-xl sm:-mt-20 sm:h-[240px] sm:w-[160px] md:-mt-24 md:h-[270px] md:w-[180px]">
            {posterPath ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${posterPath}`}
                alt={title}
                fill
                className="object-cover"
                sizes="180px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary">
                {mediaType === "movie" ? (
                  <Film className="h-10 w-10 text-muted-foreground" />
                ) : (
                  <Tv className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex w-full flex-1 flex-col gap-4 pt-2 text-center md:pt-6 md:text-left">
            {/* 1. Metadata: title, genres, runtime, studios */}
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {title}{" "}
                {year && (
                  <span className="text-xl font-normal text-muted-foreground">
                    ({year})
                  </span>
                )}
              </h1>

              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                  {mediaType === "movie" ? "Movie" : "TV"}
                </span>
                {tmdbData.genres?.map((g) => (
                  <span
                    key={g.id}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                  >
                    {g.name}
                  </span>
                ))}
              </div>

              {keywords.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 md:justify-start">
                  {keywords.map((kw) => (
                    <Link
                      key={kw.id}
                      href={`/keywords/${kw.id}?name=${encodeURIComponent(kw.name)}`}
                      className="cursor-pointer rounded-full border border-[#1f1f1f] px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-[#2563EB]/60 hover:text-white"
                    >
                      {kw.name}
                    </Link>
                  ))}
                </div>
              )}

              {runtime && runtime > 0 && (
                <p className="text-sm text-muted-foreground">
                  {mediaType === "movie"
                    ? formatRuntime(runtime)
                    : `${runtime} min per episode`}
                </p>
              )}

              {productionCompanies.length > 0 && (
                <div className="text-center md:text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Studios
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {productionCompanies.map((c) => c.name).join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* 2. Overview */}
            {tmdbData.overview && (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {tmdbData.overview}
              </p>
            )}

            {/* 3. Crew grid */}
            <CrewGrid keyCrew={keyCrew} directorLabel={directorLabel} />

            {/* 4. External links */}
            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              {externalIds?.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${externalIds.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#f5c518] px-2.5 py-1 text-xs font-bold text-black"
                >
                  IMDb
                </a>
              )}
              {homepage && (
                <a
                  href={homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Globe className="h-3 w-3" />
                  Official Site
                </a>
              )}
              <a
                href={`https://www.themoviedb.org/${mediaType}/${tmdbData.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                TMDB
              </a>
            </div>

            {/* 5. AddToLibrary + AddToList */}
            <div className="flex w-full flex-col items-center gap-2 md:items-start">
              <AddToLibrary
                mediaId={mediaItem?.id ?? null}
                tmdbId={normalized.tmdb_id}
                mediaType={mediaType}
                initialUserMedia={userMedia}
              />
              {mediaItem?.id && (
                <AddToListButton mediaId={mediaItem.id} />
              )}
            </div>

            {/* 6. Trailer */}
            <div className="flex justify-center md:justify-start">
              <TrailerSection videos={videos} />
            </div>
          </div>
        </div>

        {/* 7. Streaming providers */}
        <StreamingProviders providers={watchProviders} />

        {/* 8. Cast */}
        {cast.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Cast
            </h2>
            <div
              className="flex gap-4 overflow-x-auto pb-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {cast.map((member) => (
                <Link
                  key={member.id}
                  href={`/person/${member.id}`}
                  className="flex w-20 flex-shrink-0 flex-col items-center gap-1.5"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-secondary">
                    {member.profile_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                        alt={member.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-center text-xs font-medium leading-tight text-foreground">
                    {member.name}
                  </p>
                  <p className="text-center text-xs leading-tight text-muted-foreground">
                    {member.character}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 9. Seasons & Episodes (TV only) */}
        {mediaType === "tv" && tvSeasons.length > 0 && mediaItem && (
          <SeasonAccordion
            tmdbId={tmdbData.id}
            mediaId={mediaItem.id}
            seasons={tvSeasons}
            initialProgress={tvProgress}
            userId={userId}
          />
        )}

        {/* 10. Collection (movies only) */}
        {collection && (
          <CollectionSection
            collection={collection}
            currentTmdbId={tmdbData.id}
            userLibraryMap={userLibraryMap}
          />
        )}

        {/* 11. More Like This */}
        <RecommendationsSection
          recommendations={recommendations}
          userLibraryMap={userLibraryMap}
        />
      </div>
    </div>
  );
}

export default async function MediaDetailPage({
  params,
}: {
  params: Params;
}) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Suspense fallback={<MediaDetailSkeleton />}>
      <MediaDetailData type={type} id={id} userId={user?.id ?? null} />
    </Suspense>
  );
}
