import Link from "next/link";
import { Film } from "lucide-react";

export default function MediaNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <Film className="h-12 w-12 text-muted-foreground/40" />
      <h1 className="mt-4 text-2xl font-semibold text-foreground">
        Media not found
      </h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        This title could not be found or may no longer be available.
      </p>
      <Link
        href="/library"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
      >
        Go to Library
      </Link>
    </div>
  );
}
