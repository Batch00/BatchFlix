import { cn } from "@/lib/utils";

type Props = { mediaType: "movie" | "tv" };

export function MediaTypeBadge({ mediaType }: Props) {
  return (
    <div
      className={cn(
        "absolute left-0 top-0 z-10 rounded-br-lg rounded-tl-lg px-1.5 py-0.5 text-[10px] font-medium text-white",
        mediaType === "movie" ? "bg-[#2563EB]" : "bg-[#7c3aed]"
      )}
    >
      {mediaType === "movie" ? "Movie" : "TV"}
    </div>
  );
}
