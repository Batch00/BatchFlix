import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserLibrary } from "@/lib/queries/library";
import { LibraryContent } from "@/components/library/LibraryContent";

type SearchParams = Promise<{
  status?: string;
  sort?: string;
  view?: string;
}>;

const VALID_STATUS = ["all", "watched", "watching", "watchlist"] as const;
const VALID_SORT = ["date_added", "watched_date", "rating", "title"] as const;
const VALID_VIEW = ["grid", "list"] as const;

type Status = (typeof VALID_STATUS)[number];
type Sort = (typeof VALID_SORT)[number];
type View = (typeof VALID_VIEW)[number];

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

  const { status: rawStatus, sort: rawSort, view: rawView } =
    await searchParams;

  const status: Status = VALID_STATUS.includes(rawStatus as Status)
    ? (rawStatus as Status)
    : "all";
  const sort: Sort = VALID_SORT.includes(rawSort as Sort)
    ? (rawSort as Sort)
    : "date_added";
  const view: View = VALID_VIEW.includes(rawView as View)
    ? (rawView as View)
    : "grid";

  const items = await getUserLibrary(
    supabase,
    user.id,
    status === "all" ? { sort } : { status, sort }
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <LibraryContent
        initialItems={items}
        status={status}
        sort={sort}
        view={view}
      />
    </div>
  );
}
