"use client";

import { createContext, useContext } from "react";
import { useSearchOverlay } from "@/hooks/useSearchOverlay";
import { SearchOverlay } from "./SearchOverlay";

type SearchContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearchContext must be used within SearchProvider");
  return ctx;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const overlay = useSearchOverlay();
  return (
    <SearchContext.Provider value={overlay}>
      {children}
      <SearchOverlay isOpen={overlay.isOpen} onClose={overlay.close} />
    </SearchContext.Provider>
  );
}
