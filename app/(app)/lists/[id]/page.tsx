import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getListById } from "@/lib/queries/lists";
import { ListDetailContent } from "@/components/lists/ListDetailContent";

type Params = Promise<{ id: string }>;

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

  const list = await getListById(supabase, id, user.id);
  if (!list) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <ListDetailContent list={list} />
    </div>
  );
}
