export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 md:px-6">
      {/* Header: photo + name */}
      <div className="flex flex-col items-center gap-6 pt-4 md:flex-row md:items-start">
        <div className="h-[210px] w-[140px] flex-shrink-0 animate-pulse rounded-lg bg-[#1f1f1f] sm:h-[240px] sm:w-[160px] md:h-[270px] md:w-[180px]" />
        <div className="flex w-full flex-1 flex-col gap-3 pt-2 text-center md:pt-6 md:text-left">
          <div className="mx-auto h-8 w-2/3 animate-pulse rounded bg-[#1f1f1f] md:mx-0" />
          <div className="mx-auto h-4 w-1/3 animate-pulse rounded bg-[#1f1f1f] md:mx-0" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full animate-pulse rounded bg-[#1f1f1f]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[#1f1f1f]" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-[#1f1f1f]" />
          </div>
        </div>
      </div>

      {/* Credits grid */}
      <div className="mt-10">
        <div className="mb-4 h-5 w-24 animate-pulse rounded bg-[#1f1f1f]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] w-full animate-pulse rounded-lg bg-[#1f1f1f]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
