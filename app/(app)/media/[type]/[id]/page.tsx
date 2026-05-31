import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { User, Film, Tv } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeMediaItem,
  getDirector,
  type TMDBMovieDetail,
  type TMDBTVDetail,
  type TMDBCastMember,
} from "@/lib/tmdb";
import { getUserMediaByTmdbId } from "@/lib/queries/library";
import { AddToLibrary } from "@/components/library/AddToLibrary";
import { AddToListButton } from "@/components/library/AddToListButton";
import { MediaDetailSkeleton } from "@/components/skeletons/MediaDetailSkeleton";
import { BackButton } from "@/components/ui/BackButton";

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
  const url = `https://api.themoviedb.org/3/${type}/${id}?append_to_response=credits`;
  const res = await fetch(url, {
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

  const userMedia =
    userId && mediaItem
      ? await getUserMediaByTmdbId(
          supabase,
          userId,
          normalized.tmdb_id,
          mediaType
        )
      : null;

  const title =
    mediaType === "movie"
      ? (tmdbData as TMDBMovieDetail).title
      : (tmdbData as TMDBTVDetail).name;

  const releaseDate =
    mediaType === "movie"
      ? (tmdbData as TMDBMovieDetail).release_date
      : (tmdbData as TMDBTVDetail).first_air_date;

  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

  const runtime =
    mediaType === "movie"
      ? (tmdbData as TMDBMovieDetail).runtime
      : (tmdbData as TMDBTVDetail).episode_run_time?.[0];

  const director =
    mediaType === "movie"
      ? getDirector((tmdbData as TMDBMovieDetail).credits?.crew ?? [])
      : (tmdbData as TMDBTVDetail).created_by?.[0]?.name ?? null;

  const directorLabel = mediaType === "movie" ? "Director" : "Created by";

  const cast: TMDBCastMember[] = (
    (tmdbData as TMDBMovieDetail | TMDBTVDetail).credits?.cast ?? []
  )
    .slice(0, 10)
    .sort((a, b) => a.order - b.order);

  const backdropPath = tmdbData.backdrop_path;
  const posterPath = tmdbData.poster_path;

  return (
    <div className="min-h-screen bg-background -mt-14">
      {/* BackButton -- fixed position, sits below the nav */}
      <BackButton />

      {/* Backdrop -- bleeds to nav edge (parent has -mt-14 to cancel layout pt-14) */}
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

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 pb-16 md:px-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          {/* Poster -- overlaps the bottom edge of the backdrop */}
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
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {title}{" "}
                {year && (
                  <span className="text-xl font-normal text-muted-foreground">
                    ({year})
                  </span>
                )}
              </h1>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
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
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground md:justify-start">
              {runtime && runtime > 0 && (
                <span>
                  {mediaType === "movie"
                    ? formatRuntime(runtime)
                    : `${runtime} min per episode`}
                </span>
              )}
              {director && (
                <span>
                  <span className="text-foreground/60">{directorLabel}: </span>
                  {director}
                </span>
              )}
            </div>

            {tmdbData.overview && (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {tmdbData.overview}
              </p>
            )}

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
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Cast</h2>
            <div
              className="flex gap-4 overflow-x-auto pb-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {cast.map((member) => (
                <div
                  key={member.id}
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
                </div>
              ))}
            </div>
          </div>
        )}
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
