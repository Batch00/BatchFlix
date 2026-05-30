export function MediaRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="h-[60px] w-10 flex-shrink-0 animate-pulse rounded bg-[#1f1f1f]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#1f1f1f]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-[#1f1f1f]" />
      </div>
      <div className="hidden items-center gap-3 sm:flex">
        <div className="h-6 w-20 animate-pulse rounded-full bg-[#1f1f1f]" />
        <div className="h-4 w-24 animate-pulse rounded bg-[#1f1f1f]" />
        <div className="h-3 w-24 animate-pulse rounded bg-[#1f1f1f]" />
      </div>
    </div>
  );
}
