export function ListCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#1f1f1f]" />
        <div className="h-5 w-32 animate-pulse rounded bg-[#1f1f1f]" />
      </div>
      <div className="mt-2 h-3.5 w-3/4 animate-pulse rounded bg-[#1f1f1f]" />
      <div className="mt-4 h-3 w-16 animate-pulse rounded bg-[#1f1f1f]" />
    </div>
  );
}
