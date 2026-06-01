import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUserLibrary } from "@/lib/queries/library";
import { LibraryContent } from "@/components/library/LibraryContent";
import { MediaCardSkeleton } from "@/components/skeletons/MediaCardSkeleton";

export const metadata: Metadata = { title: "Library" };

// Fetch the user's entire library once; status/mediaType/sort filtering all
// happens client-side in LibraryContent so switching filters is instant.
async function LibraryData({ userId }: { userId: string }) {
  const supabase = await createClient();
  let items;

  try {
    items = await getUserLibrary(supabase, userId, { sort: "date_added" });
  } catch (err) {
    console.error("Library query error:", err);
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-muted-foreground">
          Failed to load library. Please try refreshing.
        </p>
      </div>
    );
  }

  return <LibraryContent initialItems={items} />;
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

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 pt-0 pb-8 md:px-6">
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryData userId={user.id} />
      </Suspense>
    </div>
  );
}
