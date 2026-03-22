import type { Card as CardType } from "../components/cards.js";
import type { GalleryListItem } from "../api/gallery.js";
import type { HandRecord } from "../game/history/recorder.js";

export type HandCardViewModel = {
  playerName: string;
  title?: string | null;
  createdAt?: string | null;
  resultLabel: "Win" | "Lose" | "Chop";
  chipDelta: number | null;
  positionLabel: string;
  handCards: CardType[];
  boardCards: Array<CardType | null>;
  authorTags?: string[] | null;
  viewerTags?: string[] | null;
};

function getParticipant(record: HandRecord, seat: number | null | undefined) {
  if (seat === null || seat === undefined) return null;
  return record.participants?.find((participant) => participant.seat === seat) ?? null;
}

function getVisibleBoard(record: HandRecord): Array<CardType | null> {
  const board = record.board ?? { flop: [], turn: null, river: null };
  const boardCards = [...(board.flop ?? []), board.turn, board.river].filter(Boolean) as CardType[];
  const revealedCount =
    record.streetEnded === "preflop"
      ? 0
      : record.streetEnded === "flop"
        ? 3
        : record.streetEnded === "turn"
          ? 4
          : 5;

  return Array.from({ length: 5 }, (_, idx) => (idx < revealedCount ? boardCards[idx] ?? null : null));
}

function normalizePosition(role?: string | null) {
  const value = String(role ?? "").toUpperCase();
  if (value === "BTN" || value === "BB" || value === "UTG" || value === "CO") return value;
  return "UNKNOWN";
}

function getResultLabel(record: HandRecord, seat: number | null | undefined): "Win" | "Lose" | "Chop" {
  if (seat === null || seat === undefined) return "Lose";
  if (!record.winners.includes(seat)) return "Lose";
  return record.winners.length > 1 ? "Chop" : "Win";
}

function getFallbackName(seat: number | null | undefined) {
  return seat === null || seat === undefined ? "Unknown" : `P${seat + 1}`;
}

function getChipDelta(record: HandRecord, seat: number | null | undefined) {
  const participant = getParticipant(record, seat);
  if (participant?.netResultPoints !== null && participant?.netResultPoints !== undefined) {
    return participant.netResultPoints;
  }
  if (seat === null || seat === undefined) return null;
  const initial = record.initialStacks?.[seat];
  const final = record.finalStacks?.[seat];
  if (typeof initial === "number" && typeof final === "number") return final - initial;
  return null;
}

function getSubjectCards(record: HandRecord, seat: number | null | undefined) {
  if (seat === null || seat === undefined) return [];
  return record.holeCards?.[seat] ?? [];
}

export function createHistoryHandCardModel(record: HandRecord): HandCardViewModel {
  const seat = record.heroIndex ?? 0;
  const participant = getParticipant(record, seat);

  return {
    playerName: participant?.username ?? getFallbackName(seat),
    resultLabel: getResultLabel(record, seat),
    chipDelta: getChipDelta(record, seat),
    positionLabel: normalizePosition(participant?.role),
    handCards: getSubjectCards(record, seat),
    boardCards: getVisibleBoard(record),
  };
}

export function createGalleryHandCardModel(item: GalleryListItem, record: HandRecord): HandCardViewModel {
  const participant =
    record.participants?.find((entry) => entry.userId && entry.userId === item.authorUserId) ?? null;
  const seat = participant?.seat ?? null;

  return {
    playerName: item.authorUsername ?? participant?.username ?? getFallbackName(seat),
    title: item.title || null,
    createdAt: item.createdAt,
    resultLabel: getResultLabel(record, seat),
    chipDelta: getChipDelta(record, seat),
    positionLabel: normalizePosition(participant?.role),
    handCards: getSubjectCards(record, seat),
    boardCards: getVisibleBoard(record),
    authorTags: [...(item.authorTags.fixed ?? []), ...(item.authorTags.free ?? [])],
    viewerTags: item.viewerTags.public ?? [],
  };
}
