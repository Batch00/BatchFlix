"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchResultRow } from "./SearchResultRow";
import { useSearch } from "@/hooks/useSearch";
import { toast } from "@/lib/toast";
import type { ListMode } from "./SearchProvider";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  listMode: ListMode | null;
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="h-[60px] w-10 flex-shrink-0 animate-pulse rounded bg-secondary" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
      </div>
    </div>
  );
}

export function SearchOverlay({ isOpen, onClose, listMode }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const { results, isLoading } = useSearch(query);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setHighlightedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [results]);

  const navigate = useCallback(
    (index: number) => {
      const result = results[index];
      if (!result) return;
      router.push(`/media/${result.media_type}/${result.id}`);
      onClose();
    },
    [results, router, onClose]
  );

  const addToList = useCallback(
    async (index: number) => {
      const result = results[index];
      if (!result || !listMode) return;
      try {
        const res = await fetch(`/api/lists/${listMode.listId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: result.id,
            mediaType: result.media_type,
          }),
        });
        if (res.ok) {
          toast.success(`Added to ${listMode.listName}`);
        } else if (res.status === 409) {
          toast.error("Already in list");
        } else {
          toast.error("Failed to add to list");
        }
      } catch {
        toast.error("Failed to add to list");
      }
    },
    [results, listMode]
  );

  const handleSelect = useCallback(
    (index: number) => {
      if (listMode) {
        addToList(index);
      } else {
        navigate(index);
      }
    },
    [listMode, addToList, navigate]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) =>
        i === 0 ? Math.max(results.length - 1, 0) : i - 1
      );
    } else if (e.key === "Enter") {
      handleSelect(highlightedIndex);
    }
  }

  if (!isOpen) return null;

  const placeholder = listMode
    ? `Add to ${listMode.listName}...`
    : "Search movies and TV shows...";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto mt-16 w-full max-w-2xl px-4 md:mt-24"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#111111] shadow-2xl">
          {listMode && (
            <div className="border-b border-[#1f1f1f] px-4 py-2">
              <span className="text-xs text-muted-foreground">
                Adding to{" "}
                <span className="font-medium text-foreground">
                  {listMode.listName}
                </span>
              </span>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent px-4 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
          />

          {(isLoading || query.length >= 2) && (
            <div className="border-t border-[#1f1f1f]">
              <div className="max-h-[480px] overflow-y-auto">
                {isLoading && (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                )}

                {!isLoading && results.length === 0 && query.length >= 2 && (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                )}

                {!isLoading &&
                  results.map((result, i) => (
                    <SearchResultRow
                      key={`${result.media_type}-${result.id}`}
                      result={result}
                      inLibrary={false}
                      highlighted={i === highlightedIndex}
                      onClick={() => handleSelect(i)}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
