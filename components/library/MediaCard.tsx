import Image from "next/image";
import Link from "next/link";
import { Film, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserMediaRow } from "@/lib/queries/library";

const STATUS_DOT: Record<string, string> = {
  watched: "bg-primary",
  watching: "bg-yellow-400",
  watchlist: "bg-muted-foreground",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "absolute bottom-2 left-2 h-2 w-2 rounded-full ring-1 ring-black/40",
        STATUS_DOT[status] ?? "bg-muted-foreground"
      )}
    />
  );
}

export function MediaCard({ item }: { item: UserMediaRow }) {
  const { media_items: m, status } = item;
  const year = m.release_date ? new Date(m.release_date).getFullYear() : null;

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

        <StatusDot status={status} />

        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <p className="line-clamp-2 text-xs font-medium text-white">
            {m.title}
          </p>
          {year && (
            <p className="mt-0.5 text-xs text-white/70">{year}</p>
          )}
          <span className="mt-1 w-fit rounded-full bg-black/40 px-2 py-0.5 text-[10px] capitalize text-white/80">
            {status}
          </span>
        </div>
      </div>
    </Link>
  );
}
