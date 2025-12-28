import { useEffect, useState } from "react";
import type { HandRecord } from "../game/history/recorder.js";

const mergePayload = (item: any): HandRecord => {
  if (item.payload && typeof item.payload === "object") {
    const p = item.payload as any;
    return {
      ...item,
      board: p.board ?? item.board,
      boardReserved: p.boardReserved ?? item.boardReserved,
      holeCards: p.holeCards ?? item.holeCards,
      initialStacks: p.initialStacks ?? item.initialStacks,
      finalStacks: p.finalStacks ?? item.finalStacks,
      actionLog: p.actionLog ?? item.actionLog ?? [],
      winners: p.winners ?? item.winners ?? [],
      handValues: p.handValues ?? item.handValues ?? [],
      seatCount: p.seatCount ?? item.seatCount,
      heroIndex: p.heroIndex ?? item.heroIndex,
      btnIndex: p.btnIndex ?? item.btnIndex,
      streetEnded: p.streetEnded ?? item.streetEnded,
    };
  }
  return item as HandRecord;
};

export function useHandHistory(shouldLoad: boolean, limit = 5) {
  const [history, setHistory] = useState<HandRecord[]>([]);

  const refresh = async () => {
    const apiBase = import.meta.env.VITE_API_BASE ?? "";
    try {
      const res = await fetch(`${apiBase}/api/history?limit=${limit}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as any[];
      const mapped = data.map(mergePayload);
      setHistory(mapped);
    } catch (e) {
      console.warn("Failed to load hand history from API", e);
      setHistory([]);
    }
  };

  useEffect(() => {
    if (shouldLoad) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldLoad, limit]);

  return { history, refresh };
}

