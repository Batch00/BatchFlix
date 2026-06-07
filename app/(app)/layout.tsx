import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TopNav } from "@/components/nav/TopNav";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { ListPickerProvider } from "@/components/providers/ListPickerProvider";
import { isDemoUser } from "@/lib/demo";

const FAVORITE_LISTS = [
  { name: "Favorite Movies", description: "Movies you love", color: "#dc2626" },
  { name: "Favorite TV Shows", description: "TV shows you love", color: "#dc2626" },
];

async function ensureFavoriteLists(userId: string) {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .schema("batchflix")
      .from("lists")
      .select("name")
      .eq("user_id", userId)
      .in("name", ["Favorite Movies", "Favorite TV Shows"]);

    const existing = new Set((data ?? []).map((l: { name: string }) => l.name));
    const toCreate = FAVORITE_LISTS.filter((l) => !existing.has(l.name));

    if (toCreate.length > 0) {
      await admin
        .schema("batchflix")
        .from("lists")
        .insert(toCreate.map((l) => ({ ...l, user_id: userId, is_pinned: true })));
    }
  } catch {
    // Non-fatal: favorites lists will be created on next load
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureFavoriteLists(user.id);
  }

  const isDemo = isDemoUser(user?.id);

  return (
    <ListPickerProvider>
      <TopNav userEmail={user?.email ?? null} />
      {isDemo && <DemoBanner />}
      <main className="min-h-[calc(100vh-3.5rem)] pb-24 pt-4 md:pb-0">{children}</main>
    </ListPickerProvider>
  );
}
