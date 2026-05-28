"use client";

import { useState, useEffect } from "react";
import type { TMDBSearchMultiResult } from "@/lib/tmdb";

export function useSearch(query: string) {
  const [results, setResults] = useState<TMDBSearchMultiResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(async () => {
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
        setResults(filtered);
      } catch {
        setError("Search failed. Please try again.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  return { results, isLoading, error };
}
