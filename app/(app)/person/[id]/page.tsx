import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/ui/BackButton";
import { PersonCreditsClient } from "@/components/media/PersonCreditsClient";
import type { TMDBPerson, TMDBPersonCredit } from "@/lib/tmdb";

type Params = Promise<{ id: string }>;

type PersonWithCredits = TMDBPerson & {
  combined_credits: {
    cast: TMDBPersonCredit[];
    crew: TMDBPersonCredit[];
  };
};

async function fetchPerson(id: string): Promise<PersonWithCredits | null> {
  const res = await fetch(
    `https://api.themoviedb.org/3/person/${id}?append_to_response=combined_credits`,
    {
      headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
      next: { revalidate: 3600 },
    }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchPerson(id);
  if (!data) return {};
  return { title: data.name };
}

type LibMapRow = {
  status: string;
  media_items: { tmdb_id: number; media_type: string } | null;
};

async function PersonDetailData({
  id,
  userId,
}: {
  id: string;
  userId: string | null;
}) {
  const [personData, supabase] = await Promise.all([
    fetchPerson(id),
    createClient(),
  ]);

  if (!personData) notFound();

  const libraryMap: Record<string, string> = {};
  if (userId) {
    const { data: libRows } = await supabase
      .schema("batchflix")
      .from("user_media")
      .select("status, media_items(tmdb_id, media_type)")
      .eq("user_id", userId);

    for (const row of (libRows ?? []) as unknown as LibMapRow[]) {
      const mi = row.media_items;
      if (mi) {
        libraryMap[`${mi.media_type}:${mi.tmdb_id}`] = row.status;
      }
    }
  }

  const castCredits = (personData.combined_credits?.cast ?? [])
    .filter(
      (c): c is TMDBPersonCredit =>
        c.media_type === "movie" || c.media_type === "tv"
    )
    .sort((a, b) => {
      const da = (a.release_date ?? a.first_air_date ?? "").slice(0, 10);
      const db = (b.release_date ?? b.first_air_date ?? "").slice(0, 10);
      return db.localeCompare(da);
    });

  const directingCredits = (personData.combined_credits?.crew ?? [])
    .filter(
      (c) =>
        c.job === "Director" &&
        (c.media_type === "movie" || c.media_type === "tv")
    )
    .sort((a, b) => {
      const da = (a.release_date ?? a.first_air_date ?? "").slice(0, 10);
      const db = (b.release_date ?? b.first_air_date ?? "").slice(0, 10);
      return db.localeCompare(da);
    });

  const metaParts = [
    personData.birthday ?? null,
    personData.place_of_birth ?? null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-4 md:px-6">
      <BackButton />

      <div className="flex flex-col items-center gap-6 py-6 md:flex-row md:items-start">
        <div className="relative h-[225px] w-[150px] flex-shrink-0 overflow-hidden rounded-xl">
          {personData.profile_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w185${personData.profile_path}`}
              alt={personData.name}
              fill
              className="object-cover"
              sizes="150px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-foreground">
            {personData.name}
          </h1>
          {personData.known_for_department && (
            <p className="text-sm text-muted-foreground">
              {personData.known_for_department}
            </p>
          )}
          {metaParts.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {metaParts.join(" · ")}
            </p>
          )}
        </div>
      </div>

      <PersonCreditsClient
        biography={personData.biography ?? ""}
        castCredits={castCredits}
        directingCredits={directingCredits}
        libraryMap={libraryMap}
      />
    </div>
  );
}

export default async function PersonPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <PersonDetailData id={id} userId={user?.id ?? null} />
    </Suspense>
  );
}
