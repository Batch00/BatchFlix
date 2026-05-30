import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUserLibrary } from "@/lib/queries/library";
import { getFavoritesListId } from "@/lib/queries/lists";
import { LibraryContent } from "@/components/library/LibraryContent";
import { MediaCardSkeleton } from "@/components/skeletons/MediaCardSkeleton";

export const metadata: Metadata = { title: "Library" };

type SearchParams = Promise<{
  status?: string;
  sort?: string;
  mediaType?: string;
}>;

const VALID_STATUS = ["all", "watched", "watching", "watchlist"] as const;
const VALID_SORT = ["date_added", "watched_date", "rating", "title"] as const;
const VALID_MEDIA_TYPE = ["all", "movie", "tv"] as const;

type Status = (typeof VALID_STATUS)[number];
type Sort = (typeof VALID_SORT)[number];
type MediaType = (typeof VALID_MEDIA_TYPE)[number];

type LibraryDataProps = {
  userId: string;
  status: Status;
  sort: Sort;
  mediaType: MediaType;
};

async function LibraryData({ userId, status, sort, mediaType }: LibraryDataProps) {
  const supabase = await createClient();
  const [items, favoritesListId] = await Promise.all([
    getUserLibrary(supabase, userId, {
      ...(status !== "all" ? { status } : {}),
      sort,
      ...(mediaType !== "all" ? { mediaType } : {}),
    }),
    getFavoritesListId(supabase, userId),
  ]);

  return (
    <LibraryContent
      initialItems={items}
      status={status}
      sort={sort}
      mediaType={mediaType}
      favoritesListId={favoritesListId}
    />
  );
}

function LibrarySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-32 animate-pulse rounded bg-[#1f1f1f]" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-[#1f1f1f]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { status: rawStatus, sort: rawSort, mediaType: rawMediaType } =
    await searchParams;

  const status: Status = VALID_STATUS.includes(rawStatus as Status)
    ? (rawStatus as Status)
    : "all";
  const sort: Sort = VALID_SORT.includes(rawSort as Sort)
    ? (rawSort as Sort)
    : "date_added";
  const mediaType: MediaType = VALID_MEDIA_TYPE.includes(
    rawMediaType as MediaType
  )
    ? (rawMediaType as MediaType)
    : "all";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryData
          userId={user.id}
          status={status}
          sort={sort}
          mediaType={mediaType}
        />
      </Suspense>
    </div>
  );
}
