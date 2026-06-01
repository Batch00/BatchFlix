import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUserLists } from "@/lib/queries/lists";
import { ListsContent } from "@/components/lists/ListsContent";
import { ListCardSkeleton } from "@/components/skeletons/ListCardSkeleton";

export const metadata: Metadata = { title: "Lists" };

async function ListsData({ userId }: { userId: string }) {
  const supabase = await createClient();
  const lists = await getUserLists(supabase, userId);
  return <ListsContent initialLists={lists} />;
}

function ListsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-16 animate-pulse rounded bg-[#1f1f1f]" />
        <div className="h-9 w-28 animate-pulse rounded-md bg-[#1f1f1f]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ListCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default async function ListsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 pt-2 pb-8 md:px-6">
      <Suspense fallback={<ListsSkeleton />}>
        <ListsData userId={user.id} />
      </Suspense>
    </div>
  );
}
