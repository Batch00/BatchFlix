"use client";

import { useState, useEffect } from "react";
import type { TMDBSearchMultiResult } from "@/lib/tmdb";

export function useSearch(query: string) {
  const [results, setResults] = useState<TMDBSearchMultiResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      const id = setTimeout(() => {
        setResults([]);
        setError(null);
        setIsLoading(false);
      }, 0);
      return () => clearTimeout(id);
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          query,
          include_adult: "false",
          language: "en-US",
          page: "1",
        });
        const res = await fetch(`/api/tmdb/search/multi?${params}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        const filtered = (data.results as TMDBSearchMultiResult[]).filter(
          (r) => r.media_type !== "person"
        );
        if (!cancelled) {
          setResults(filtered);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Search failed. Please try again.");
          setResults([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, isLoading, error };
}
