import { cn } from "@/lib/utils";

const CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  watched: { bg: "bg-blue-900/80", text: "text-blue-200", label: "Watched" },
  watching: { bg: "bg-yellow-900/80", text: "text-yellow-200", label: "Watching" },
  watchlist: { bg: "bg-zinc-800/80", text: "text-zinc-300", label: "Watchlist" },
};

type Props = { status: "watched" | "watching" | "watchlist" };

export function StatusBadge({ status }: Props) {
  const cfg = CONFIG[status] ?? CONFIG.watchlist;
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 rounded-b-lg py-0.5 text-center text-[10px] font-medium",
        cfg.bg,
        cfg.text
      )}
    >
      {cfg.label}
    </div>
  );
}
