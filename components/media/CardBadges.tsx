import { cn } from "@/lib/utils";

/**
 * Timezone-safe future check for a YYYY-MM-DD string. Passing the string
 * straight to new Date() parses it as UTC midnight, which reads as "yesterday"
 * for anyone west of Greenwich.
 */
export function isFutureDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return false;
  return new Date(+y, +m - 1, +d) > new Date();
}

type Props = {
  /** release_date for movies, first_air_date for TV. */
  releaseDate?: string | null;
  /** TV with a season whose air date is known and still in the future. */
  hasUpcomingSeason?: boolean;
  /** Existing hasNewContent logic: tv, watched, tracked episodes < total. */
  hasNewSeason?: boolean;
  /** "overlay" stacks over a poster, "inline" returns bare pills for a row. */
  variant?: "overlay" | "inline";
  className?: string;
};

/**
 * Coming Soon and New Season badges. Both can apply at once (an upcoming
 * season on a show whose next season is already listed), so they stack rather
 * than replace each other.
 */
export function CardBadges({
  releaseDate,
  hasUpcomingSeason = false,
  hasNewSeason = false,
  variant = "overlay",
  className,
}: Props) {
  // A title is coming soon either because it has not premiered at all or
  // because an already running show has an announced season ahead of it.
  const comingSoon = isFutureDate(releaseDate) || hasUpcomingSeason;
  if (!comingSoon && !hasNewSeason) return null;

  if (variant === "inline") {
    return (
      <>
        {comingSoon && (
          <span className="flex-shrink-0 rounded-full bg-yellow-500/90 px-1.5 py-0.5 text-[10px] font-bold text-black">
            COMING SOON
          </span>
        )}
        {hasNewSeason && (
          <span className="flex-shrink-0 rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#93c5fd]">
            New Season
          </span>
        )}
      </>
    );
  }

  return (
    <div
      className={cn(
        "absolute right-1 top-1 z-10 flex flex-col items-end gap-1",
        className
      )}
    >
      {comingSoon && (
        <span className="rounded-full bg-yellow-500/90 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-black">
          COMING SOON
        </span>
      )}
      {hasNewSeason && (
        <span className="rounded-full bg-[#3B82F6] px-1.5 py-0.5 text-[9px] font-bold leading-tight text-white">
          NEW SEASON
        </span>
      )}
    </div>
  );
}
