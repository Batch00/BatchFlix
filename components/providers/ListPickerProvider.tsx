"use client";

import { createContext, useContext, useState } from "react";
import { ListPickerModal } from "@/components/ui/ListPickerModal";

type ListPickerContextType = {
  openListPicker: (mediaId: string) => void;
};

const ListPickerContext = createContext<ListPickerContextType>({
  openListPicker: () => {},
});

export function useListPicker() {
  return useContext(ListPickerContext);
}

export function ListPickerProvider({ children }: { children: React.ReactNode }) {
  const [mediaId, setMediaId] = useState<string | null>(null);

  return (
    <ListPickerContext.Provider value={{ openListPicker: setMediaId }}>
      {children}
      {mediaId && (
        <ListPickerModal mediaId={mediaId} onClose={() => setMediaId(null)} />
      )}
    </ListPickerContext.Provider>
  );
}
