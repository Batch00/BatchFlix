export function MediaCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="aspect-[2/3] w-full animate-pulse bg-[#1f1f1f]" />
    </div>
  );
}
