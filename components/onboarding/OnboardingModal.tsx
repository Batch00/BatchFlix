"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clapperboard, CheckCircle2, Film, Tv } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSearch } from "@/hooks/useSearch";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { TMDBSearchMultiResult } from "@/lib/tmdb";

const LS_KEY = "batchflix_onboarding_complete";

type AddedItem = { tmdbId: number; mediaType: string; title: string };

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors duration-150",
            i === current ? "bg-primary" : "bg-[#1f1f1f]"
          )}
        />
      ))}
    </div>
  );
}

function SearchRow({
  result,
  added,
  onAdd,
}: {
  result: TMDBSearchMultiResult;
  added: boolean;
  onAdd: () => void;
}) {
  const title = result.title ?? result.name ?? "Untitled";
  const dateStr = result.release_date ?? result.first_air_date ?? "";
  const year = dateStr ? new Date(dateStr).getFullYear() : null;

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="relative h-[54px] w-9 flex-shrink-0 overflow-hidden rounded">
        {result.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w185${result.poster_path}`}
            alt={title}
            fill
            className="object-cover"
            sizes="36px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            {result.media_type === "movie" ? (
              <Film className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Tv className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {year && (
          <p className="mt-0.5 text-xs text-muted-foreground">{year}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={added}
        className={cn(
          "flex-shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors duration-150",
          added
            ? "bg-primary/20 text-primary"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {added ? "Added" : "Add"}
      </button>
    </div>
  );
}

type Props = {
  show: boolean;
};

export function OnboardingModal({ show }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<AddedItem[]>([]);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const { results, isLoading } = useSearch(query);

  useEffect(() => {
    if (show && typeof window !== "undefined") {
      const done = localStorage.getItem(LS_KEY);
      if (!done) {
        const id = setTimeout(() => setOpen(true), 0);
        return () => clearTimeout(id);
      }
    }
  }, [show]);

  function complete() {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, "1");
    }
    setOpen(false);
    router.refresh();
  }

  async function handleAdd(result: TMDBSearchMultiResult) {
    const tmdbId = result.id;
    if (addedIds.has(tmdbId)) return;
    try {
      const res = await fetch("/api/library/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          mediaType: result.media_type,
          status: "watched",
        }),
      });
      if (!res.ok) throw new Error("Add failed");
      const title = result.title ?? result.name ?? "Untitled";
      setAdded((prev) => [...prev, { tmdbId, mediaType: result.media_type, title }]);
      setAddedIds((prev) => new Set(prev).add(tmdbId));
    } catch {
      toast.error("Could not add item. Try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md gap-0 p-0 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Step 1: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-5 px-8 py-10 text-center">
            <Clapperboard className="h-12 w-12 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Welcome to BatchFlix
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your personal movie and TV tracker. Let&apos;s get you set up.
              </p>
            </div>
            <Button className="w-full" onClick={() => setStep(1)}>
              Get started
            </Button>
            <StepDots current={0} total={3} />
          </div>
        )}

        {/* Step 2: Add items */}
        {step === 1 && (
          <div className="flex flex-col gap-0">
            <div className="px-6 pt-6 pb-4 text-center">
              <h2 className="text-lg font-bold text-foreground">
                What have you been watching?
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Search and add a few titles to kick things off.
              </p>
              {added.length > 0 && (
                <p className="mt-2 text-xs font-medium text-primary">
                  {added.length} {added.length === 1 ? "item" : "items"} added
                </p>
              )}
            </div>

            <div className="border-t border-[#1f1f1f] px-6 py-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies and TV shows..."
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                autoFocus
              />
            </div>

            <div className="max-h-56 overflow-y-auto border-t border-[#1f1f1f]">
              {isLoading && query.length >= 2 && (
                <div className="space-y-1 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2">
                      <div className="h-[54px] w-9 animate-pulse rounded bg-[#1f1f1f]" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-[#1f1f1f]" />
                        <div className="h-3 w-1/4 animate-pulse rounded bg-[#1f1f1f]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isLoading && query.length < 2 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Type to search movies and TV shows
                </p>
              )}
              {!isLoading && query.length >= 2 && results.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </p>
              )}
              {!isLoading &&
                results.map((result) => (
                  <SearchRow
                    key={`${result.media_type}-${result.id}`}
                    result={result}
                    added={addedIds.has(result.id)}
                    onAdd={() => handleAdd(result)}
                  />
                ))}
            </div>

            <div className="flex items-center justify-between border-t border-[#1f1f1f] px-6 py-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Skip
              </button>
              <Button
                onClick={() => setStep(2)}
                disabled={added.length === 0}
                size="sm"
              >
                Continue
              </Button>
            </div>

            <div className="pb-4 text-center">
              <StepDots current={1} total={3} />
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-5 px-8 py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-foreground">
                You&apos;re all set!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {added.length > 0
                  ? `${added.length} ${added.length === 1 ? "item" : "items"} added to your library.`
                  : "Your library is ready. Start tracking what you watch."}
              </p>
            </div>
            <Button className="w-full" onClick={complete}>
              Go to my Library
            </Button>
            <StepDots current={2} total={3} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
