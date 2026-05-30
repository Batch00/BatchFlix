import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getListById } from "@/lib/queries/lists";
import { ListDetailContent } from "@/components/lists/ListDetailContent";
import { MediaCardSkeleton } from "@/components/skeletons/MediaCardSkeleton";

type Params = Promise<{ id: string }>;

async function ListDetailData({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const supabase = await createClient();
  const list = await getListById(supabase, id, userId);
  if (!list) notFound();
  return <ListDetailContent list={list} />;
}

function ListDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-12 animate-pulse rounded bg-[#1f1f1f]" />
          <div className="h-8 w-48 animate-pulse rounded bg-[#1f1f1f]" />
          <div className="h-4 w-16 animate-pulse rounded bg-[#1f1f1f]" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-md bg-[#1f1f1f]" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default async function ListDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <Suspense fallback={<ListDetailSkeleton />}>
        <ListDetailData id={id} userId={user.id} />
      </Suspense>
    </div>
  );
}
