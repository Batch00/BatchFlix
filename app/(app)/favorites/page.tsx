import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getFavoritesListIds, getListById } from "@/lib/queries/lists";
import { PageHeader } from "@/components/ui/PageHeader";
import { RankingList } from "@/components/favorites/RankingList";

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

      <div className="mt-8 flex flex-col gap-12">
        <section>
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Movies
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              {moviesList?.list_items.length ?? 0}
            </span>
          </div>
          <RankingList
            initialItems={moviesList?.list_items ?? []}
            listId={moviesListId ?? ""}
            mediaType="movie"
            listName="Favorite Movies"
          />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              TV Shows
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              {tvList?.list_items.length ?? 0}
            </span>
          </div>
          <RankingList
            initialItems={tvList?.list_items ?? []}
            listId={tvListId ?? ""}
            mediaType="tv"
            listName="Favorite TV Shows"
          />
        </section>
      </div>
    </div>
  );
}
