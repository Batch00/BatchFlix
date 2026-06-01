"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = 2026;
const STATS_PREF_KEY = "batchflix_stats_prefs";

type Pill = { label: string; value: string };

const PILLS: Pill[] = [
  { label: "All Time", value: "lifetime" },
  { label: String(CURRENT_YEAR), value: String(CURRENT_YEAR) },
  { label: "Last 12 Months", value: "last12" },
  { label: String(CURRENT_YEAR - 1), value: String(CURRENT_YEAR - 1) },
  { label: String(CURRENT_YEAR - 2), value: String(CURRENT_YEAR - 2) },
  { label: String(CURRENT_YEAR - 3), value: String(CURRENT_YEAR - 3) },
  { label: String(CURRENT_YEAR - 4), value: String(CURRENT_YEAR - 4) },
];

type Props = {
  current: string;
};

export function TimeRangeSelector({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // On mount, if no range is in the URL, apply the saved preference.
  useEffect(() => {
    if (searchParams.get("range")) return;
    const saved = localStorage.getItem(STATS_PREF_KEY);
    if (saved && saved !== current) {
      router.replace(`${pathname}?range=${saved}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelect(value: string) {
    try {
      localStorage.setItem(STATS_PREF_KEY, value);
    } catch {
      // Ignore write failures
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {PILLS.map((pill) => (
        <button
          key={pill.value}
          type="button"
          onClick={() => handleSelect(pill.value)}
          className={cn(
            "flex-shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors duration-150",
            current === pill.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          )}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}
