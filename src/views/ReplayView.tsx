import { useEffect, useMemo, useRef, useState } from "react";
import type { HandRecord } from "../game/history/recorder.js";
import type { TableState, ActionLogEntry, PlayerState, Street } from "../game/table.js";
import Seat from "../components/Seat.js";
import BoardArea from "../components/BoardArea.js";
import InfoBar from "../components/InfoBar.js";
import { HAND_CATEGORY_LABEL, compareHandValues, evaluateBestOfSeven } from "../game/handEval.js";
import type { Card as CardType } from "../components/cards.js";

const HERO_INDEX = 2;

type Props = {
  record: HandRecord;
  onBack: () => void;
};

function buildInitialTable(record: HandRecord): TableState {
  const seatCount = record.seatCount ?? record.holeCards.length;
  const boardReserved = record.boardReserved ?? [];
  const board = record.board ?? { flop: [], turn: undefined as CardType | undefined, river: undefined as CardType | undefined };
  const players: PlayerState[] = Array.from({ length: seatCount }).map((_, i) => ({
    hand: record.holeCards[i] ?? [],
    stack: record.initialStacks?.[i] ?? 100,
    bet: 0,
    folded: false,
    allIn: false,
  }));

  return {
    game: {
      players,
      flop: board.flop ?? [],
      turn: board.turn ?? ({ rank: "2", suit: "c" } as CardType),
      river: board.river ?? ({ rank: "3", suit: "c" } as CardType),
      pot: 0,
      currentBet: 0,
    },
    boardReserved,
    street: "preflop",
    currentPlayer: record.actionLog?.[0]?.playerIndex ?? 0,
    roundStarter: record.actionLog?.[0]?.playerIndex ?? 0,
    lastAggressor: null,
    lastRaise: 1,
    revealStreet: "preflop",
    btnIndex: record.btnIndex ?? 0,
    autoWin: record.autoWin ?? null,
    handId: record.handId,
    handStartedAt: record.startedAt ?? Date.now(),
    initialStacks: record.initialStacks ?? Array(seatCount).fill(100),
    actionLog: [],
  };
}

function applyLogEntry(table: TableState, entry: ActionLogEntry): TableState {
  const players = table.game.players.map((p) => ({ ...p }));
  const p = players[entry.playerIndex];
  if (!p) return table;
  const street: Street = entry.street;
  if (entry.kind === "fold") {
    p.folded = true;
  }
  p.bet = entry.betAfter;
  p.stack = entry.stackAfter;
  if (p.stack === 0) p.allIn = true;

  const revealStreet = entry.street;

  return {
    ...table,
    game: {
      ...table.game,
      players,
      pot: entry.potAfter,
      currentBet: entry.currentBetAfter,
    },
    street,
    revealStreet,
    currentPlayer: entry.playerIndex,
    actionLog: [...table.actionLog, entry],
  };
}

function getHandDescription(v?: ReturnType<typeof evaluateBestOfSeven>): string | undefined {
  if (!v) return undefined;
  const base = HAND_CATEGORY_LABEL[v.category];
  switch (v.category) {
    case "one-pair":
      return `${base} ${v.ranks[0]}`;
    case "two-pair":
      return v.ranks.length >= 2 ? `${base} ${v.ranks[0]} and ${v.ranks[1]}` : base;
    case "three-of-a-kind":
    case "four-of-a-kind":
      return `${base} ${v.ranks[0]}`;
    default:
      return base;
  }
}

function ReplayView({ record, onBack }: Props) {
  const [table, setTable] = useState<TableState>(() => buildInitialTable(record));
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<number | null>(null);
  const [lastAction, setLastAction] = useState<{ playerIndex: number; text: string } | null>(null);

  const actionCount = record.actionLog.length;

  const visibleBoard = useMemo(() => {
    if (!table) return [];
    if (table.street === "preflop") return [];
    if (table.street === "flop") return table.game.flop;
    if (table.street === "turn") return [...table.game.flop, table.game.turn];
    return [...table.game.flop, table.game.turn, table.game.river];
  }, [table]);

  const showdown = useMemo(() => {
    if (table.autoWin !== null) {
      return {
        winners: [table.autoWin],
        values: Array(table.game.players.length).fill(null),
      };
    }
    const fullBoard = [...table.game.flop, table.game.turn, table.game.river];
    const values: (ReturnType<typeof evaluateBestOfSeven> | null)[] = [];
    let best: ReturnType<typeof evaluateBestOfSeven> | null = null;
    let winners: number[] = [];
    table.game.players.forEach((p, idx) => {
      if (p.folded) {
        values.push(null);
        return;
      }
      const v = evaluateBestOfSeven(p.hand, fullBoard);
      values.push(v);
      if (!best) {
        best = v;
        winners = [idx];
      } else {
        const cmp = compareHandValues(v, best);
        if (cmp > 0) {
          best = v;
          winners = [idx];
        } else if (cmp === 0) {
          winners.push(idx);
        }
      }
    });
    return { winners, values };
  }, [table]);

  const actionLabel = (entry: ActionLogEntry) => {
    const amt = entry.amount ?? 0;
    switch (entry.kind) {
      case "fold":
        return "Fold";
      case "check":
        return "Check";
      case "call":
        return amt > 0 ? `Call ${amt}BB` : "Call";
      case "bet":
        return amt > 0 ? `Bet ${amt}BB` : "Bet";
      case "raise":
        return amt > 0 ? `Raise ${amt}BB` : "Raise";
      default:
        return entry.kind;
    }
  };

  useEffect(() => {
    if (!playing) return;
    if (step >= actionCount) return;
    timerRef.current = window.setTimeout(() => {
      const entry = record.actionLog[step];
      setTable((prev) => applyLogEntry(prev, entry));
      setLastAction({ playerIndex: entry.playerIndex, text: actionLabel(entry) });
      setStep((s) => s + 1);
    }, 1500);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [playing, step, actionCount, record.actionLog]);

  // Move to showdown when all actions are consumed.
  useEffect(() => {
    if (step >= actionCount) {
      setPlaying(false);
      setLastAction(null);
      setTable((prev) => ({ ...prev, street: "showdown" }));
    }
  }, [step, actionCount]);

  const reset = () => {
    setTable(buildInitialTable(record));
    setStep(0);
    setPlaying(true);
    setLastAction(null);
  };

  const togglePlay = () => setPlaying((v) => !v);

  const getHandDescriptionMemo = (idx: number) =>
    showdown ? getHandDescription(showdown.values[idx] ?? undefined) : undefined;

  const isSeatActive = (idx: number) => {
    if (table.street === "showdown") {
      return !!showdown?.winners.includes(idx);
    }
    return table.currentPlayer === idx;
  };

  if (!table) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="text-sm text-slate-300">
          Replaying: <span className="text-emerald-300 font-semibold">{record.handId}</span> / Actions: {actionCount}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
          >
            Reset
          </button>
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
          >
            Back
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl">
        <InfoBar
          streetLabel={table.street}
          pot={table.game.pot}
          devShowAll={true}
          onToggleShowAll={() => {}}
          onNewHand={() => {}}
          showdownText={undefined}
        />
      </div>

      <div className="w-full max-w-4xl mt-2 grid grid-cols-[1fr_3fr_1fr] grid-rows-[0.7fr_auto_0.7fr] gap-2 h-[280px] lg:h-[310px]">
        <div className="row-start-1 col-start-2 flex items-center justify-center">
          <Seat
            label="P0"
            hand={table.game.players[0]?.hand ?? []}
            player={table.game.players[0] ?? { hand: [], bet: 0, stack: 0, folded: false, allIn: false }}
            isWinner={!!showdown?.winners.includes(0)}
            handDescription={getHandDescriptionMemo(0)}
            showCards
            isButton={table.btnIndex === 0}
            popupText={lastAction?.playerIndex === 0 ? lastAction.text : undefined}
            isActive={isSeatActive(0)}
          />
        </div>

        <div className="row-start-2 col-start-1 col-span-3 flex items-center justify-center">
          <BoardArea cards={visibleBoard} pot={table.game.pot} />
        </div>

        <div className="row-start-2 col-start-1 flex items-start justify-center mt-1">
          <Seat
            label="P3"
            hand={table.game.players[3]?.hand ?? []}
            player={table.game.players[3] ?? { hand: [], bet: 0, stack: 0, folded: false, allIn: false }}
            isWinner={!!showdown?.winners.includes(3)}
            handDescription={getHandDescriptionMemo(3)}
            showCards
            isButton={table.btnIndex === 3}
            popupText={lastAction?.playerIndex === 3 ? lastAction.text : undefined}
            isActive={isSeatActive(3)}
          />
        </div>

        <div className="row-start-2 col-start-3 flex items-start justify-center mt-1">
          <Seat
            label="P1"
            hand={table.game.players[1]?.hand ?? []}
            player={table.game.players[1] ?? { hand: [], bet: 0, stack: 0, folded: false, allIn: false }}
            isWinner={!!showdown?.winners.includes(1)}
            handDescription={getHandDescriptionMemo(1)}
            showCards
            isButton={table.btnIndex === 1}
            popupText={lastAction?.playerIndex === 1 ? lastAction.text : undefined}
            isActive={isSeatActive(1)}
          />
        </div>

        <div className="row-start-3 col-start-2 flex flex-col items-center justify-center gap-3">
          <Seat
            label="You"
            hand={table.game.players[HERO_INDEX]?.hand ?? []}
            player={table.game.players[HERO_INDEX] ?? { hand: [], bet: 0, stack: 0, folded: false, allIn: false }}
            isHero
            isWinner={!!showdown?.winners.includes(HERO_INDEX)}
            handDescription={getHandDescriptionMemo(HERO_INDEX)}
            showCards
            isButton={table.btnIndex === HERO_INDEX}
            popupText={lastAction?.playerIndex === HERO_INDEX ? lastAction.text : undefined}
            isActive={isSeatActive(HERO_INDEX)}
          />
        </div>
      </div>
    </div>
  );
}

export default ReplayView;

