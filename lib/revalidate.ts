import { revalidatePath } from "next/cache";

// Every page that renders user_media, tv_progress or list membership. Called by
// mutation routes so no server-side cache can serve these pages stale.
export function revalidateUserData() {
  revalidatePath("/library");
  revalidatePath("/lists");
  revalidatePath("/lists/[id]", "page");
  revalidatePath("/favorites");
  revalidatePath("/stats");
  revalidatePath("/discover");
  revalidatePath("/media/[type]/[id]", "page");
}
