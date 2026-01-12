import { useEffect, useMemo, useRef, useState } from "react";
import type { HandRecord } from "../game/history/recorder.js";
import type { TableState, ActionLogEntry, PlayerState, Street } from "../game/table.js";
import Seat from "../components/Seat.js";
import BoardArea from "../components/BoardArea.js";
import InfoBar from "../components/InfoBar.js";
import type { Card as CardType } from "../components/cards.js";
import {
  actionLabel,
  computeShowdownInfo,
  getHandDescription,
  PRESENTATION_DELAYS,
} from "../game/presentation/timeline.js";

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

function ReplayView({ record, onBack }: Props) {
  const [table, setTable] = useState<TableState>(() => buildInitialTable(record));
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<number | null>(null);
  const [lastAction, setLastAction] = useState<{ playerIndex: number; text: string } | null>(null);
  const heroSeatIndex = record.heroIndex ?? 0;
  const seatCount = record.seatCount ?? record.holeCards.length;
  const participants = record.participants ?? [];
  const nameBySeat = useMemo(() => {
    const map = new Map<number, string>();
    participants.forEach((p) => {
      if (typeof p.seat === "number" && p.username) {
        map.set(p.seat, p.username);
      }
    });
    return map;
  }, [participants]);
  const participantBySeat = useMemo(() => {
    const map = new Map<number, (typeof participants)[number]>();
    participants.forEach((p) => {
      if (typeof p.seat === "number") {
        map.set(p.seat, p);
      }
    });
    return map;
  }, [participants]);
  const heroName = nameBySeat.get(heroSeatIndex);
  const seatOrder = useMemo(() => {
    const base = Array.from({ length: seatCount }, (_, i) => i);
    if (heroSeatIndex < 0 || base.length === 0) return base;
    const n = base.length;
    const bottom = n - 1;
    return base.map((_, i) => {
      const src = (heroSeatIndex + (i - bottom) + n) % n;
      return src;
    });
  }, [heroSeatIndex, seatCount]);

  const actionCount = record.actionLog.length;

  const visibleBoard = useMemo(() => {
    if (!table) return [];
    if (table.street === "preflop") return [];
    if (table.street === "flop") return table.game.flop;
    if (table.street === "turn") return [...table.game.flop, table.game.turn];
    return [...table.game.flop, table.game.turn, table.game.river];
  }, [table]);

  const showdown = useMemo(() => {
    if (!table) return { winners: [], values: [] };
    return computeShowdownInfo(table);
  }, [table]);

  useEffect(() => {
    if (!playing) return;
    if (step >= actionCount) return;
    const entry = record.actionLog[step];
    const prev = record.actionLog[step - 1];
    const streetChanged = step > 0 && prev && prev.street !== entry.street;

    if (streetChanged) {
      timerRef.current = window.setTimeout(() => {
        setTable((prevTable) => ({ ...prevTable, street: entry.street }));
        setLastAction(null);
        timerRef.current = window.setTimeout(() => {
          setTable((prevTable) => applyLogEntry(prevTable, entry));
          setLastAction({ playerIndex: entry.playerIndex, text: actionLabel(entry) });
          setStep((s) => s + 1);
        }, PRESENTATION_DELAYS.actionMs);
      }, PRESENTATION_DELAYS.boardMs);
    } else {
      timerRef.current = window.setTimeout(() => {
        setTable((prevTable) => applyLogEntry(prevTable, entry));
        setLastAction({ playerIndex: entry.playerIndex, text: actionLabel(entry) });
        setStep((s) => s + 1);
      }, PRESENTATION_DELAYS.actionMs);
    }
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
      setTable((prev) => ({ ...prev, street: record.streetEnded ?? "showdown" }));
    }
  }, [step, actionCount, record.streetEnded]);

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
        {seatOrder.map((seatIdx, i) => {
          const player =
            table.game.players[seatIdx] ??
            { hand: [], bet: 0, stack: 0, folded: false, allIn: false };
          const isHero = seatIdx === heroSeatIndex;
          const participant = participantBySeat.get(seatIdx);
          const shouldReveal =
            isHero ||
            (table.street === "showdown" && participant?.showedHoleCards === true);
          const label = isHero
            ? heroName
              ? `You (${heroName})`
              : "You"
            : nameBySeat.get(seatIdx) ?? `P${seatIdx}`;
          const posClass =
            i === 0
              ? "row-start-2 col-start-1 flex items-start justify-center mt-1"
              : i === 1
              ? "row-start-1 col-start-2 flex items-center justify-center"
              : i === 2
              ? "row-start-2 col-start-3 flex items-start justify-center mt-1"
              : "row-start-3 col-start-2 flex flex-col items-center justify-center gap-3";

          return (
            <div key={seatIdx} className={posClass}>
              <Seat
                label={label}
                hand={player.hand ?? []}
                player={player}
                isHero={isHero}
                isWinner={!!showdown?.winners.includes(seatIdx)}
                handDescription={getHandDescriptionMemo(seatIdx)}
                showCards={shouldReveal}
                isButton={table.btnIndex === seatIdx}
                popupText={lastAction?.playerIndex === seatIdx ? lastAction.text : undefined}
                isActive={isSeatActive(seatIdx)}
              />
            </div>
          );
        })}

        <div className="row-start-2 col-start-1 col-span-3 flex items-center justify-center">
          <BoardArea cards={visibleBoard} pot={table.game.pot} />
        </div>
      </div>
    </div>
  );
}

export default ReplayView;

