import Image from "next/image";
import Link from "next/link";
import { Film, Tv } from "lucide-react";
import { MediaTypeBadge } from "@/components/media/MediaTypeBadge";
import { StatusBadge } from "@/components/media/StatusBadge";
import type { UserMediaRow } from "@/lib/queries/library";

export function MediaCard({ item }: { item: UserMediaRow }) {
  const { media_items: m, status } = item;
  const year = m.release_date ? +m.release_date.slice(0, 4) : null;
  const watched = item.watchedEpisodes ?? 0;
  const total = m.total_episodes ?? 0;
  const showProgress = m.media_type === "tv" && watched > 0 && watched < total;
  const pct = total > 0 ? (watched / total) * 100 : 0;

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

        <MediaTypeBadge mediaType={m.media_type} />

        <StatusBadge status={status} />

        {showProgress && (
          <div className="absolute bottom-6 left-0 right-0 h-[3px] bg-black/40">
            <div
              className="h-full bg-[#2563EB]"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

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
