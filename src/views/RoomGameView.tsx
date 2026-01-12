import { useEffect, useMemo, useRef, useState } from "react";
import BoardArea from "../components/BoardArea.js";
import Seat from "../components/Seat.js";
import RoomActionBar from "../components/RoomActionBar.js";
import { useRoomState } from "../hooks/useRoomState.js";
import { useAuth } from "../hooks/useAuth.js";
import type { ActionLogEntry, PlayerState } from "../game/table.js";
import type { Street } from "../game/types.js";
import {
  HAND_CATEGORY_LABEL,
  compareHandValues,
  evaluateBestOfSeven,
} from "../game/handEval.js";

type Props = {
  apiBase: string;
  roomId: string;
  onBack: () => void;
  onRoomClosed: () => void;
};

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function RoomGameView({ apiBase, roomId, onBack, onRoomClosed }: Props) {
  const { room, game, error: wsError, closedMessage } = useRoomState(apiBase, roomId);
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionAmount, setActionAmount] = useState(0);
  const [startSent, setStartSent] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [turnStartMs, setTurnStartMs] = useState<number | null>(null);
  const [displayCurrentPlayer, setDisplayCurrentPlayer] = useState<number | null>(null);
  const turnDelayRef = useRef<number | null>(null);
  const [displayStreet, setDisplayStreet] = useState<Street>("preflop");
  const streetDelayRef = useRef<number | null>(null);
  const [showdownReveal, setShowdownReveal] = useState(false);
  const [showdownResult, setShowdownResult] = useState(false);
  const showdownRevealRef = useRef<number | null>(null);
  const showdownResultRef = useRef<number | null>(null);
  const showdownHandRef = useRef<string | null>(null);

  const heroUserId = auth.user?.userId ?? "";
  const heroSeatIndex = room?.seats.findIndex((s) => s.userId === heroUserId) ?? -1;
  const table = game?.table;
  const heroPlayer = table?.game?.players?.[heroSeatIndex];
  const isMyTurn = displayCurrentPlayer === heroSeatIndex;
  const actionCtx = table ? getActionContext(table, heroSeatIndex) : null;
  const actionSeconds = room?.config?.actionSeconds ?? 60;
  const visibleBoard = useMemo(() => {
    if (!table) return [];
    const street = displayStreet;
    const flop = table.game?.flop ?? [];
    const turn = table.game?.turn ? [table.game.turn] : [];
    const river = table.game?.river ? [table.game.river] : [];
    if (street === "preflop") return [];
    if (street === "flop") return flop;
    if (street === "turn") return [...flop, ...turn];
    return [...flop, ...turn, ...river]; // river or showdown
  }, [table, displayStreet]);

  // Delay turn display by 1s after an action to let popup linger.
  useEffect(() => {
    if (!table) {
      setDisplayCurrentPlayer(null);
      if (turnDelayRef.current !== null) {
        window.clearTimeout(turnDelayRef.current);
        turnDelayRef.current = null;
      }
      return;
    }
    const next = table.currentPlayer ?? null;
    if (displayCurrentPlayer === null) {
      setDisplayCurrentPlayer(next);
      return;
    }
    if (next === displayCurrentPlayer) return;
    if (turnDelayRef.current !== null) {
      window.clearTimeout(turnDelayRef.current);
    }
    turnDelayRef.current = window.setTimeout(() => {
      setDisplayCurrentPlayer(next);
      turnDelayRef.current = null;
    }, 1000);
    return () => {
      if (turnDelayRef.current !== null) {
        window.clearTimeout(turnDelayRef.current);
        turnDelayRef.current = null;
      }
    };
  }, [table, displayCurrentPlayer]);

  const streetOrder: Street[] = ["preflop", "flop", "turn", "river", "showdown"];
  useEffect(() => {
    if (!table) {
      setDisplayStreet("preflop");
      if (streetDelayRef.current !== null) {
        window.clearTimeout(streetDelayRef.current);
        streetDelayRef.current = null;
      }
      return;
    }
    const nextStreet = (table.revealStreet ?? table.street) as Street;
    if (!displayStreet) {
      setDisplayStreet(nextStreet);
      return;
    }
    if (nextStreet === displayStreet) return;
    const currentIdx = streetOrder.indexOf(displayStreet);
    const nextIdx = streetOrder.indexOf(nextStreet);
    if (nextIdx <= currentIdx) {
      setDisplayStreet(nextStreet);
      return;
    }
    if (streetDelayRef.current !== null) {
      window.clearTimeout(streetDelayRef.current);
    }
    streetDelayRef.current = window.setTimeout(() => {
      setDisplayStreet(nextStreet);
      streetDelayRef.current = null;
    }, 1000);
    return () => {
      if (streetDelayRef.current !== null) {
        window.clearTimeout(streetDelayRef.current);
        streetDelayRef.current = null;
      }
    };
  }, [table, displayStreet, streetOrder]);

  const lastAction = useMemo(() => {
    const log = table?.actionLog ?? [];
    return log.length > 0 ? log[log.length - 1] : null;
  }, [table?.actionLog]);

  const isShowdown =
    table?.street === "showdown" || table?.revealStreet === "showdown";

  const showdownInfo = useMemo(() => {
    if (!table || !isShowdown) {
      return {
        winners: [] as number[],
        values: [] as (ReturnType<typeof evaluateBestOfSeven> | null)[],
      };
    }
    if (table.autoWin !== null) {
      return {
        winners: [table.autoWin],
        values: Array(table.game.players.length).fill(null),
      };
    }
    const board = [...table.game.flop, table.game.turn, table.game.river];
    if (board.length < 5) {
      return {
        winners: [] as number[],
        values: [] as (ReturnType<typeof evaluateBestOfSeven> | null)[],
      };
    }
    let best: ReturnType<typeof evaluateBestOfSeven> | null = null;
    let winners: number[] = [];
    const values = table.game.players.map((p: PlayerState, idx: number) => {
      if (p.folded) return null;
      const v = evaluateBestOfSeven(p.hand, board);
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
      return v;
    });
    return { winners, values };
  }, [table, isShowdown]);

  useEffect(() => {
    if (!table || !isShowdown) {
      setShowdownReveal(false);
      setShowdownResult(false);
      showdownHandRef.current = null;
      if (showdownRevealRef.current !== null) {
        window.clearTimeout(showdownRevealRef.current);
        showdownRevealRef.current = null;
      }
      if (showdownResultRef.current !== null) {
        window.clearTimeout(showdownResultRef.current);
        showdownResultRef.current = null;
      }
      return;
    }
    if (showdownHandRef.current === table.handId) return;
    showdownHandRef.current = table.handId;
    setShowdownReveal(false);
    setShowdownResult(false);
    if (showdownRevealRef.current !== null) {
      window.clearTimeout(showdownRevealRef.current);
    }
    if (showdownResultRef.current !== null) {
      window.clearTimeout(showdownResultRef.current);
    }
    showdownRevealRef.current = window.setTimeout(() => {
      setShowdownReveal(true);
      showdownRevealRef.current = null;
    }, 1000);
    showdownResultRef.current = window.setTimeout(() => {
      setShowdownResult(true);
      showdownResultRef.current = null;
    }, 2000);
    return () => {
      if (showdownRevealRef.current !== null) {
        window.clearTimeout(showdownRevealRef.current);
        showdownRevealRef.current = null;
      }
      if (showdownResultRef.current !== null) {
        window.clearTimeout(showdownResultRef.current);
        showdownResultRef.current = null;
      }
    };
  }, [table, isShowdown]);

  // heartbeat
  useEffect(() => {
    const id = window.setInterval(() => {
      postJson(`${apiBase}/api/rooms/${roomId}/heartbeat`, {}).catch(() => {});
    }, 20000);
    return () => window.clearInterval(id);
  }, [apiBase, roomId]);

  const seatCount = room?.seats?.length ?? 0;
  const neededPlayers = Math.max(0, 2 - seatCount);

  // ストリートが進むたびにベット欄をミニマムにリセット
  useEffect(() => {
    if (!table) return;
    const ac = getActionContext(table, heroSeatIndex);
    if (!ac) return;
    const desiredTotal =
      table.street === "preflop"
        ? 3
        : Math.ceil((table.game?.pot ?? 0) * 0.5);
    const minTotal =
      table.game?.currentBet === 0 ? ac.minBetTotal ?? 1 : ac.minRaiseTotal ?? 1;
    const clamped = Math.min(Math.max(desiredTotal, minTotal), ac.maxTotal);
    setActionAmount(clamped);
  }, [table?.street, table?.revealStreet, heroSeatIndex, table]);

  useEffect(() => {
    if (!isMyTurn) {
      setTurnStartMs(null);
      setClockTick(0);
      return undefined;
    }
    const now = Date.now();
    setTurnStartMs(now);
    setClockTick(now);
    const id = window.setInterval(() => {
      setClockTick(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [isMyTurn]);

  const clockSeconds = useMemo(() => {
    if (!isMyTurn) return actionSeconds;
    if (!turnStartMs) return actionSeconds;
    const now = clockTick || Date.now();
    const elapsedSec = Math.floor((now - turnStartMs) / 1000);
    return Math.max(0, actionSeconds - elapsedSec);
  }, [actionSeconds, clockTick, isMyTurn, turnStartMs]);

  // auto-start when enough players and no hand yet
  useEffect(() => {
    if (table) return;
    if (neededPlayers > 0) return;
    if (startSent) return;
    setStartSent(true);
    postJson(`${apiBase}/api/rooms/${roomId}/start`, {}).catch(() => setStartSent(false));
  }, [table, neededPlayers, apiBase, roomId, startSent]);

  const sendAction = async (kind: string) => {
    if (heroSeatIndex < 0) {
      setError("You are not seated in this room.");
      return;
    }
    const action: any = { playerIndex: heroSeatIndex, kind };
    if (kind === "bet" || kind === "raise") action.amount = actionAmount;
    setLoading(true);
    try {
      await postJson(`${apiBase}/api/rooms/${roomId}/action`, action);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const maxSeats = room?.maxSeats ?? 4;

  // Seat order rotated so hero (if seated) is at bottom index (maxSeats - 1)
  const seatOrder = useMemo(() => {
    const base = [0, 1, 2, 3].slice(0, maxSeats);
    if (heroSeatIndex < 0) return base;
    const n = base.length;
    const bottom = n - 1;
    return base.map((_, i) => {
      const src = (heroSeatIndex + (i - bottom) + n) % n;
      return src;
    });
  }, [maxSeats, heroSeatIndex]);

  const getHandDescription = (
    v?: ReturnType<typeof evaluateBestOfSeven> | null
  ) => {
    if (!v) return "";
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
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-5xl flex items-center justify-between">
        <h1 className="text-2xl font-bold">Online Table</h1>
        <button
          onClick={async () => {
            try {
              await postJson(`${apiBase}/api/rooms/${roomId}/leave`, {});
            } catch (e: any) {
              setError(e?.message ?? String(e));
              return;
            }
            window.localStorage.removeItem("lastRoomId");
            onBack();
          }}
          className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-sm font-semibold"
        >
          Leave
        </button>
      </div>

      {(error || wsError) && (
        <div className="w-full max-w-5xl text-sm text-rose-400">{error ?? wsError}</div>
      )}
      {closedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-800 p-5 text-center">
            <div className="text-sm text-slate-100">{closedMessage}</div>
            <button
              onClick={onRoomClosed}
              className="mt-4 px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl bg-slate-800/50 rounded-lg border border-slate-700 p-4 relative overflow-hidden">
        {!table && (
          <div className="text-sm text-amber-300 mb-3">
            Need {neededPlayers} more player{neededPlayers === 1 ? "" : "s"} to start a hand.
          </div>
        )}

        <div className="relative w-full aspect-[16/9]">
          {/* Seats layout: left, top, right, bottom(self) */}
          {seatOrder.map((seatIdx, i) => {
            const seat = room?.seats?.find((s) => s.seatIndex === seatIdx);
            const player =
              table?.game.players?.[seatIdx] ??
              (seat ? { hand: [], bet: 0, stack: seat.stack, folded: false, allIn: false } : null);
            const showCards = seatIdx === heroSeatIndex || (isShowdown && showdownReveal);
            const isEmpty = !seat;
            const resultPopup =
              showdownResult && isShowdown && seat
                ? showdownInfo.winners.includes(seatIdx)
                  ? `WIN ${getHandDescription(showdownInfo.values[seatIdx])}`
                  : "LOSE"
                : undefined;
            const actionPopup =
              lastAction && lastAction.playerIndex === seatIdx
                ? actionLabel(lastAction)
                : undefined;
            const popup = resultPopup ?? actionPopup;

            const posClass =
              i === 0
                ? "absolute top-1/2 left-6 -translate-y-1/2"
                : i === 1
                ? "absolute top-6 left-1/2 -translate-x-1/2"
                : i === 2
                ? "absolute top-1/2 right-6 -translate-y-1/2"
                : "absolute bottom-4 left-1/2 -translate-x-1/2";

            return (
              <div key={seatIdx} className={`${posClass} flex flex-col items-center gap-2`}>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isEmpty ? "bg-slate-700/40 text-slate-400" : "bg-slate-700 text-slate-100"
                  }`}
                >
                  {seat ? seat.username : positionLabel(seatIdx, table?.btnIndex ?? 0)}
                </div>
                {player ? (
                  <Seat
                    label={positionLabel(seatIdx, table?.btnIndex ?? 0)}
                    hand={player.hand ?? []}
                    player={player}
                    isWinner={false}
                    showCards={showCards}
                    isButton={table?.btnIndex === seatIdx}
                    popupText={popup}
                    isActive={displayCurrentPlayer === seatIdx}
                  />
                ) : (
                  <div className="w-24 h-28 rounded-xl border border-slate-700 bg-slate-800/30" />
                )}
              </div>
            );
          })}

          {/* Board: only show when table exists */}
          {table && (
            <div className="absolute left-1/2 top-1/2 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex justify-center">
              <BoardArea cards={visibleBoard} pot={table?.game.pot ?? 0} />
            </div>
          )}
        </div>
      </div>

      {table && (
        <div className="w-full max-w-5xl bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Send Action</div>
            <div
              className={`text-sm font-semibold ${
                isMyTurn ? "text-emerald-300" : "text-slate-500"
              }`}
            >
              Clock: {clockSeconds}s
            </div>
          </div>
          <RoomActionBar
            currentPlayer={displayCurrentPlayer ?? table.currentPlayer ?? 0}
            legal={actionCtx?.legal ?? []}
            amount={actionAmount}
            onAmountChange={(v) => setActionAmount(v)}
            onAction={(k) => sendAction(k)}
            disabled={loading || !isMyTurn || heroSeatIndex < 0}
            toCall={actionCtx?.toCall}
            minBetTotal={actionCtx?.minBetTotal}
            minRaiseTotal={actionCtx?.minRaiseTotal}
            stack={heroPlayer?.stack}
          />
        </div>
      )}
    </div>
  );
}

function positionLabel(playerIndex: number, btnIndex: number) {
  const n = 4;
  if (playerIndex === btnIndex) return "BTN";
  if (playerIndex === (btnIndex + 1) % n) return "BB";
  if (playerIndex === (btnIndex + 2) % n) return "UTG";
  return "CO";
}

function actionLabel(entry: ActionLogEntry) {
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
}

function getActionContext(table: any, heroSeatIndex: number) {
  if (!table || heroSeatIndex < 0) return null;
  const p = table.game?.players?.[heroSeatIndex];
  if (!p) return null;
  const currentBet = table.game?.currentBet ?? 0;
  const lastRaise = table.lastRaise ?? 1;
  const toCall = Math.max(0, currentBet - (p.bet ?? 0));
  const maxTotal = (p.bet ?? 0) + (p.stack ?? 0);
  const minBetTotal = Math.min(Math.max(1, p.bet ?? 0, currentBet), maxTotal);
  const minRaiseTotal = Math.min(
    currentBet === 0 ? minBetTotal : Math.max(currentBet + lastRaise, currentBet + 1),
    maxTotal
  );

  const legal: string[] = ["fold"];
  if (toCall === 0) {
    legal.push("check");
    if ((p.stack ?? 0) > 0) legal.push("bet");
  } else {
    legal.push("call");
    if ((p.stack ?? 0) > toCall) legal.push("raise");
  }

  return { toCall, minBetTotal, minRaiseTotal, maxTotal, legal };
}
