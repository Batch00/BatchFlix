import { toast } from "sonner";
import { DEMO_USER_ID } from "./constants";

export { DEMO_USER_ID };

export function isDemoUser(userId: string | undefined): boolean {
  return userId === DEMO_USER_ID;
}

export function demoGuardResponse(): Response {
  return new Response(
    JSON.stringify({
      error:
        "Demo accounts are read-only. Request access at batch-apps.com to save your own data.",
    }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

export function handleDemoResponse(response: Response): boolean {
  if (response.status === 403) {
    toast.error("Demo accounts are read-only", {
      description: "Request access at batch-apps.com",
    });
    return true;
  }
  return false;
}
