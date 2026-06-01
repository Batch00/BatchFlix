import { useCallback, useState } from "react";

/**
 * State backed by localStorage. Reads the stored value lazily on first render
 * (client only) so there is no post-hydration flash, and writes on every update.
 * Falls back to `defaultValue` during SSR and when nothing is stored.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersisted = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore write failures (private mode, quota, etc.)
      }
    },
    [key]
  );

  return [value, setPersisted];
}
