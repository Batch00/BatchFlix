import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="text-8xl font-bold text-[#1f1f1f]">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">
        Page not found
      </h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        This page does not exist or you do not have access.
      </p>
      <Link
        href="/library"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
      >
        Go home
      </Link>
    </div>
  );
}
