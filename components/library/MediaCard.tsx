import Image from "next/image";
import Link from "next/link";
import { Film, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserMediaRow } from "@/lib/queries/library";

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  watched: { bg: "bg-blue-900/80", text: "text-blue-200", label: "Watched" },
  watching: { bg: "bg-yellow-900/80", text: "text-yellow-200", label: "Watching" },
  watchlist: { bg: "bg-zinc-800/80", text: "text-zinc-300", label: "Watchlist" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE[status] ?? STATUS_BADGE.watchlist;
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 rounded-b-lg py-0.5 text-center text-[10px] font-medium",
        config.bg,
        config.text
      )}
    >
      {config.label}
    </div>
  );
}

export function MediaCard({ item }: { item: UserMediaRow }) {
  const { media_items: m, status } = item;
  const year = m.release_date ? +m.release_date.slice(0, 4) : null;

  return (
    <Link
      href={`/media/${m.media_type}/${m.tmdb_id}`}
      className="group relative overflow-hidden rounded-lg border border-border bg-card transition-transform duration-150 hover:scale-[1.02]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {m.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
            alt={m.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            {m.media_type === "movie" ? (
              <Film className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Tv className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}

        <StatusBadge status={status} />

        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <p className="line-clamp-2 text-xs font-medium text-white">
            {m.title}
          </p>
          {year && (
            <p className="mt-0.5 text-xs text-white/70">{year}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
