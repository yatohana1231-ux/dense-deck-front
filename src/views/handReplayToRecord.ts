import type { HandRecord } from "../game/history/recorder.js";

export function mapReplayToRecord(replay: any): HandRecord | null {
  if (!replay) return null;
  if (!Array.isArray(replay.boardCards)) return null;
  const cards = replay.boardCards as any[];
  const flop = cards.slice(0, 3);
  const turn = cards[3];
  const river = cards[4];
  const participants = Array.isArray(replay.participants) ? replay.participants : [];
  const seatCount = replay.maxPlayers ?? participants.length;
  const holeCards = Array.from({ length: seatCount }).map((_, idx) => {
    const p = participants.find((pp: any) => pp.seat === idx);
    return p?.holeCards ?? [];
  });
  return {
    handId: replay.handId,
    startedAt: replay.handStartedAt ? new Date(replay.handStartedAt).getTime() : Date.now(),
    endedAt: replay.playedAt ? new Date(replay.playedAt).getTime() : Date.now(),
    btnIndex: replay.buttonSeat ?? 0,
    heroIndex: 0,
    streetEnded: replay.result?.streetEnded ?? "showdown",
    autoWin: replay.result?.autoWin ?? null,
    participants: participants.map((p: any) => ({
      seat: p.seat,
      userId: p.userId ?? null,
      username: p.username ?? null,
      showedHoleCards: p.showedHoleCards ?? null,
      foldedStreet: p.foldedStreet ?? null,
    })),
    board: { flop, turn, river },
    holeCards,
    initialStacks: replay.initialStacks ?? [],
    finalStacks: replay.finalStacks ?? [],
    actionLog: replay.actions ?? [],
    winners: replay.result?.winners ?? [],
    handValues: replay.result?.handValues ?? [],
    seatCount,
    pot: replay.result?.pot ?? 0,
  };
}
