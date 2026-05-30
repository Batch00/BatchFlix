export function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-[#1f1f1f]" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-[#1f1f1f]" />
        <div className="h-64 animate-pulse rounded-xl bg-[#1f1f1f]" />
      </div>

      <div className="h-48 animate-pulse rounded-xl bg-[#1f1f1f]" />

      <div className="h-64 animate-pulse rounded-xl bg-[#1f1f1f]" />
    </div>
  );
}
