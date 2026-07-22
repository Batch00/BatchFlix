export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 md:px-6">
      <div className="flex flex-col gap-10">
        {Array.from({ length: 4 }).map((_, row) => (
          <div key={row} className="flex flex-col gap-3">
            <div className="h-6 w-40 animate-pulse rounded bg-[#1f1f1f]" />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] w-[120px] flex-shrink-0 animate-pulse rounded-lg bg-[#1f1f1f] sm:w-[150px]"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
