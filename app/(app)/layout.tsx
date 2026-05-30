import { createClient } from "@/lib/supabase/server";
import { getFavoritesListId } from "@/lib/queries/lists";
import { TopNav } from "@/components/nav/TopNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const favoritesListId = user
    ? await getFavoritesListId(supabase, user.id)
    : null;

  return (
    <>
      <TopNav favoritesListId={favoritesListId} userEmail={user?.email ?? null} />
      <main className="min-h-[calc(100vh-3.5rem)] pt-14">{children}</main>
    </>
  );
}
