import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getFavoritesListIds, getListById } from "@/lib/queries/lists";
import { PageHeader } from "@/components/ui/PageHeader";
import { FavoritesPageClient } from "@/components/favorites/FavoritesPageClient";

export const metadata: Metadata = { title: "Favorites & Rankings" };

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { movies: moviesListId, tv: tvListId } = await getFavoritesListIds(
    supabase,
    user.id
  );

  const [moviesList, tvList] = await Promise.all([
    moviesListId ? getListById(supabase, moviesListId, user.id) : null,
    tvListId ? getListById(supabase, tvListId, user.id) : null,
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-8 pt-4 md:px-6">
      <PageHeader title="Favorites & Rankings" />
      <div className="mt-8">
        <FavoritesPageClient
          moviesList={moviesList?.list_items ?? []}
          tvList={tvList?.list_items ?? []}
          moviesListId={moviesListId ?? ""}
          tvListId={tvListId ?? ""}
        />
      </div>
    </div>
  );
}
