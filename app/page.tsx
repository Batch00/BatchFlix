import { RequestAccessForm } from "@/components/RequestAccessForm";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            BatchFlix
          </h1>
          <p className="text-muted-foreground">
            Track everything you watch
          </p>
        </div>

        <Link
          href="#request-access"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Request Access
        </Link>
      </div>

      <section
        id="request-access"
        className="mt-24 w-full max-w-md scroll-mt-16"
      >
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">
            Request access
          </h2>
          <p className="text-sm text-muted-foreground">
            BatchFlix is invite-only. Fill out the form and Carson will review
            your request.
          </p>
        </div>
        <RequestAccessForm />
      </section>
    </div>
  );
}
