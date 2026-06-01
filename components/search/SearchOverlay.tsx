"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { SearchResultRow } from "./SearchResultRow";
import { useSearch } from "@/hooks/useSearch";
import { toast } from "@/lib/toast";
import type { ListMode, FavoritesMode } from "./SearchProvider";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  listMode: ListMode | null;
  favoritesMode: FavoritesMode | null;
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

export function SearchOverlay({ isOpen, onClose, listMode, favoritesMode }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const { results, isLoading, error } = useSearch(query);

  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      setQuery("");
      setHighlightedIndex(0);
      inputRef.current?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  useEffect(() => {
    const id = setTimeout(() => setHighlightedIndex(0), 0);
    return () => clearTimeout(id);
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

  const addToFavorites = useCallback(
    async (index: number) => {
      const result = results[index];
      if (!result || !favoritesMode) return;
      try {
        const res = await fetch("/api/library/add-favorite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: result.id,
            mediaType: result.media_type,
            listId: favoritesMode.listId,
          }),
        });
        if (res.ok) {
          toast.success(`Added to ${favoritesMode.listName}`);
          onClose();
          router.refresh();
        } else {
          toast.error("Failed to add to favorites");
        }
      } catch {
        toast.error("Failed to add to favorites");
      }
    },
    [results, favoritesMode, onClose, router]
  );

  const handleSelect = useCallback(
    (index: number) => {
      if (favoritesMode) {
        addToFavorites(index);
      } else if (listMode) {
        addToList(index);
      } else {
        navigate(index);
      }
    },
    [favoritesMode, listMode, addToFavorites, addToList, navigate]
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

  const activeMode = listMode ?? favoritesMode;
  const placeholder = activeMode
    ? `Add to ${activeMode.listName}...`
    : "Search movies and TV shows...";

  const showResults = isLoading || query.length >= 2;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Mobile: full-screen. Desktop: centered panel */}
      <div
        className="flex h-full flex-col md:mx-auto md:mt-24 md:h-auto md:max-w-2xl md:px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-1 flex-col overflow-hidden bg-[#111111] animate-[fadeIn_0.15s_ease-out] md:rounded-xl md:border md:border-[#1f1f1f] md:shadow-2xl">
          {activeMode && (
            <div className="border-b border-[#1f1f1f] px-4 py-2">
              <span className="text-xs text-muted-foreground">
                Adding to{" "}
                <span className="font-medium text-foreground">
                  {activeMode.listName}
                </span>
              </span>
            </div>
          )}

          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent px-4 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={onClose}
              className="block flex-shrink-0 px-4 py-4 text-sm text-[#71717a] hover:text-white md:hidden"
            >
              Cancel
            </button>
          </div>

          {showResults && (
            <div className="border-t border-[#1f1f1f]">
              <div className="flex-1 overflow-y-auto md:max-h-[480px]">
                {isLoading && (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                )}

                {!isLoading && error && (
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <RefreshCw className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Search unavailable. Try again.
                    </p>
                  </div>
                )}

                {!isLoading && !error && results.length === 0 &&
                  query.length >= 2 && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No results for &ldquo;{query}&rdquo;
                    </p>
                  )}

                {!isLoading && !error &&
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

          {!showResults && (
            <div className="border-t border-[#1f1f1f] px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Type to search movies and TV shows
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
