"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useSearchOverlay } from "@/hooks/useSearchOverlay";
import { SearchOverlay } from "./SearchOverlay";

export type ListMode = { listId: string; listName: string };

type SearchContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  openForList: (listId: string, listName: string) => void;
  listMode: ListMode | null;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearchContext must be used within SearchProvider");
  return ctx;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const overlay = useSearchOverlay();
  const [listMode, setListMode] = useState<ListMode | null>(null);

  const openForList = useCallback(
    (listId: string, listName: string) => {
      setListMode({ listId, listName });
      overlay.open();
    },
    [overlay]
  );

  const close = useCallback(() => {
    setListMode(null);
    overlay.close();
  }, [overlay]);

  const value: SearchContextValue = {
    isOpen: overlay.isOpen,
    open: overlay.open,
    close,
    toggle: overlay.toggle,
    openForList,
    listMode,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchOverlay
        isOpen={overlay.isOpen}
        onClose={close}
        listMode={listMode}
      />
    </SearchContext.Provider>
  );
}
