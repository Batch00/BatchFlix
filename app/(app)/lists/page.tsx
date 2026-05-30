import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserLists } from "@/lib/queries/lists";
import { ListsContent } from "@/components/lists/ListsContent";

export default async function ListsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const lists = await getUserLists(supabase, user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <ListsContent initialLists={lists} />
    </div>
  );
}
