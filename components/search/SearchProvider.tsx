"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useSearchOverlay } from "@/hooks/useSearchOverlay";
import { SearchOverlay } from "./SearchOverlay";

export type ListMode = { listId: string; listName: string };
export type FavoritesMode = {
  listId: string;
  mediaType: "movie" | "tv";
  listName: string;
};

type SearchContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  openForList: (listId: string, listName: string) => void;
  listMode: ListMode | null;
  openForFavorites: (listId: string, mediaType: "movie" | "tv", listName: string) => void;
  favoritesMode: FavoritesMode | null;
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
  const [favoritesMode, setFavoritesMode] = useState<FavoritesMode | null>(null);

  const openForList = useCallback(
    (listId: string, listName: string) => {
      setListMode({ listId, listName });
      setFavoritesMode(null);
      overlay.open();
    },
    [overlay]
  );

  const openForFavorites = useCallback(
    (listId: string, mediaType: "movie" | "tv", listName: string) => {
      setFavoritesMode({ listId, mediaType, listName });
      setListMode(null);
      overlay.open();
    },
    [overlay]
  );

  const close = useCallback(() => {
    setListMode(null);
    setFavoritesMode(null);
    overlay.close();
  }, [overlay]);

  const value: SearchContextValue = {
    isOpen: overlay.isOpen,
    open: overlay.open,
    close,
    toggle: overlay.toggle,
    openForList,
    listMode,
    openForFavorites,
    favoritesMode,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchOverlay
        isOpen={overlay.isOpen}
        onClose={close}
        listMode={listMode}
        favoritesMode={favoritesMode}
      />
    </SearchContext.Provider>
  );
}
