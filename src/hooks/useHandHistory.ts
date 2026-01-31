import { useEffect, useState } from "react";
import type { HandRecord } from "../game/history/recorder.js";

const mergePayload = (item: any, heroUserId?: string): HandRecord => {
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
      autoWin: p.autoWin ?? item.autoWin,
      startedAt: p.startedAt ?? item.startedAt,
    };
  }

  if (Array.isArray(item.boardCards)) {
    const cards = item.boardCards as any[];
    const flop = cards.slice(0, 3);
    const turn = cards[3];
    const river = cards[4];
    const participants = Array.isArray(item.participants) ? item.participants : [];
    const seatCount = item.maxPlayers ?? participants.length;
    const holeCards = Array.from({ length: seatCount }).map((_, idx) => {
      const p = participants.find((pp: any) => pp.seat === idx);
      return p?.holeCards ?? [];
    });
    const heroSeat =
      heroUserId && participants.length > 0
        ? participants.find((pp: any) => pp.userId === heroUserId)?.seat
        : undefined;

    return {
      handId: item.handId,
      startedAt: item.handStartedAt
        ? new Date(item.handStartedAt).getTime()
        : Date.now(),
      endedAt: item.playedAt ? new Date(item.playedAt).getTime() : Date.now(),
      btnIndex: item.buttonSeat ?? 0,
      heroIndex: heroSeat ?? item.result?.heroIndex ?? 2,
      streetEnded: item.result?.streetEnded ?? "showdown",
      autoWin: item.result?.autoWin ?? null,
      participants: participants.map((p: any) => ({
        seat: p.seat,
        userId: p.userId ?? null,
        username: p.username ?? null,
        showedHoleCards: p.showedHoleCards ?? null,
        foldedStreet: p.foldedStreet ?? null,
      })),
      board: { flop, turn, river },
      holeCards,
      initialStacks: item.initialStacks ?? [],
      finalStacks: item.finalStacks ?? [],
      actionLog: item.actions ?? [],
      winners: item.result?.winners ?? [],
      handValues: item.result?.handValues ?? [],
      seatCount,
      pot: item.result?.pot ?? 0,
    };
  }

  return item as HandRecord;
};

export function useHandHistory(
  shouldLoad: boolean,
  limit = 5,
  heroUserId?: string,
  page = 1,
  excludePreflopFolds = false
) {
  const [history, setHistory] = useState<HandRecord[]>([]);

  const refresh = async () => {
    const apiBase = import.meta.env.VITE_API_BASE ?? "";
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        page: String(page),
      });
      if (excludePreflopFolds) {
        params.set("excludePreflopFolds", "true");
      }
      const res = await fetch(
        `${apiBase}/api/history?${params.toString()}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as any[];
      const mapped = data.map((item) => mergePayload(item, heroUserId));
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
  }, [shouldLoad, limit, page, heroUserId, excludePreflopFolds]);

  return { history, refresh };
}

