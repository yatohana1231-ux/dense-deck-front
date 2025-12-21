import { useEffect, useState } from "react";
import type { HandRecord } from "../game/history/recorder";

const STORAGE_KEY = "dense-deck-hand-history";

export function useHandHistory(shouldLoad: boolean, limit = 5) {
  const [history, setHistory] = useState<HandRecord[]>([]);

  const refresh = () => {
    if (typeof window === "undefined") {
      setHistory([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHistory([]);
        return;
      }
      const parsed: HandRecord[] = JSON.parse(raw);
      const sorted = [...parsed].sort(
        (a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0)
      );
      setHistory(sorted.slice(0, limit));
    } catch (e) {
      console.warn("Failed to load hand history", e);
      setHistory([]);
    }
  };

  useEffect(() => {
    if (shouldLoad) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldLoad]);

  return { history, refresh };
}
