export function MediaDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-[400px] w-full animate-pulse bg-[#1f1f1f]" />

      <div className="mx-auto max-w-5xl px-4 pb-16 md:px-6">
        <div className="-mt-32 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="mx-auto h-[270px] w-[180px] flex-shrink-0 animate-pulse rounded-lg bg-[#1f1f1f] md:mx-0" />

          <div className="flex flex-1 flex-col gap-4 pt-2 md:pt-16">
            <div className="space-y-2">
              <div className="h-8 w-3/4 animate-pulse rounded bg-[#1f1f1f]" />
              <div className="flex gap-2">
                <div className="h-6 w-16 animate-pulse rounded-full bg-[#1f1f1f]" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-[#1f1f1f]" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-[#1f1f1f]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-[#1f1f1f]" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-[#1f1f1f]" />
              <div className="h-3 w-4/6 animate-pulse rounded bg-[#1f1f1f]" />
            </div>
            <div className="h-10 w-40 animate-pulse rounded-lg bg-[#1f1f1f]" />
          </div>
        </div>

        <div className="mt-10">
          <div className="mb-4 h-5 w-12 animate-pulse rounded bg-[#1f1f1f]" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex w-20 flex-shrink-0 flex-col items-center gap-1.5"
              >
                <div className="h-20 w-20 animate-pulse rounded-full bg-[#1f1f1f]" />
                <div className="h-3 w-16 animate-pulse rounded bg-[#1f1f1f]" />
                <div className="h-3 w-12 animate-pulse rounded bg-[#1f1f1f]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
