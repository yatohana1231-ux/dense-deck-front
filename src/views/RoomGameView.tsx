import { useEffect, useMemo, useRef, useState } from "react";
import BoardArea from "../components/BoardArea.js";
import Seat from "../components/Seat.js";
import RoomActionBar from "../components/RoomActionBar.js";
import { useRoomState } from "../hooks/useRoomState.js";
import { useAuth } from "../hooks/useAuth.js";
import type { Street } from "../game/types.js";
import type { HandValue } from "../game/handEval.js";
import {
  actionLabel,
  computeShowdownInfo,
  getHandDescription,
  isShowdownStreet,
  PRESENTATION_DELAYS,
} from "../game/presentation/timeline.js";
import { compareHandValues } from "../game/handEval.js";

type Props = {
  apiBase: string;
  roomId: string;
  stackDisplay: "chips" | "blinds";
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

export default function RoomGameView({
  apiBase,
  roomId,
  stackDisplay,
  onBack,
  onRoomClosed,
}: Props) {
  const { room, game, error: wsError, closedMessage } = useRoomState(apiBase, roomId);
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionAmount, setActionAmount] = useState(0);
  const [startSent, setStartSent] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [displayCurrentPlayer, setDisplayCurrentPlayer] = useState<number | null>(null);
  const turnDelayRef = useRef<number | null>(null);
  const lastHandIdRef = useRef<string | null>(null);
  const [displayStreet, setDisplayStreet] = useState<Street>("preflop");
  const streetDelayRef = useRef<number | null>(null);
  const [showdownReveal, setShowdownReveal] = useState(false);
  const [showdownResult, setShowdownResult] = useState(false);
  const showdownRevealRef = useRef<number | null>(null);
  const showdownResultRef = useRef<number | null>(null);
  const showdownRevealHandRef = useRef<string | null>(null);
  const showdownResultHandRef = useRef<string | null>(null);
  const nextHandTimerRef = useRef<number | null>(null);
  const nextHandForRef = useRef<string | null>(null);
  const payoutTimerRef = useRef<number | null>(null);
  const [payoutApplied, setPayoutApplied] = useState(false);
  const [foldReserved, setFoldReserved] = useState(false);
  const [rebuyLoading, setRebuyLoading] = useState(false);

  const heroUserId = auth.user?.userId ?? "";
  const heroSeatIndex = room?.seats.findIndex((s) => s.userId === heroUserId) ?? -1;
  const heroSeat = room?.seats.find((s) => s.userId === heroUserId) ?? null;
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
  const isShowdown = isShowdownStreet(table);
  const isAutoRunout =
    !!table && table.street === "showdown" && table.revealStreet === "river";

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
    if (table.handId !== lastHandIdRef.current) {
      lastHandIdRef.current = table.handId;
      if (turnDelayRef.current !== null) {
        window.clearTimeout(turnDelayRef.current);
        turnDelayRef.current = null;
      }
      setDisplayCurrentPlayer(table.currentPlayer ?? null);
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
    }, PRESENTATION_DELAYS.actionMs);
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
    if (nextStreet === displayStreet) return;
    if (isAutoRunout && !showdownReveal) return;
    const currentIdx = streetOrder.indexOf(displayStreet);
    const nextIdx = streetOrder.indexOf(nextStreet);
    if (nextIdx <= currentIdx) {
      setDisplayStreet(nextStreet);
      return;
    }
    const stepStreet = streetOrder[currentIdx + 1] ?? nextStreet;
    if (streetDelayRef.current !== null) {
      window.clearTimeout(streetDelayRef.current);
    }
    streetDelayRef.current = window.setTimeout(() => {
      setDisplayStreet(stepStreet);
      streetDelayRef.current = null;
    }, PRESENTATION_DELAYS.boardMs);
    return () => {
      if (streetDelayRef.current !== null) {
        window.clearTimeout(streetDelayRef.current);
        streetDelayRef.current = null;
      }
    };
  }, [table, displayStreet, streetOrder, isAutoRunout, showdownReveal]);

  const lastAction = useMemo(() => {
    const log = table?.actionLog ?? [];
    return log.length > 0 ? log[log.length - 1] : null;
  }, [table?.actionLog]);

  const showdownInfo = useMemo(() => {
    if (!table || !isShowdown) {
      return { winners: [], values: [] };
    }
    return computeShowdownInfo(table);
  }, [table, isShowdown, displayStreet]);
  const showdownWinners = showdownInfo.winners ?? [];

  useEffect(() => {
    if (!table || !isShowdown) {
      setShowdownReveal(false);
      setShowdownResult(false);
      showdownRevealHandRef.current = null;
      showdownResultHandRef.current = null;
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
    const canReveal = isAutoRunout || displayStreet === "river";
    if (!canReveal) return;
    if (showdownRevealHandRef.current === table.handId) return;
    showdownRevealHandRef.current = table.handId;
    setShowdownReveal(false);
    setShowdownResult(false);
    if (showdownRevealRef.current !== null) {
      window.clearTimeout(showdownRevealRef.current);
    }
    showdownRevealRef.current = window.setTimeout(() => {
      setShowdownReveal(true);
      showdownRevealRef.current = null;
    }, PRESENTATION_DELAYS.showdownRevealMs);
    return () => {
      if (showdownRevealRef.current !== null) {
        window.clearTimeout(showdownRevealRef.current);
        showdownRevealRef.current = null;
      }
    };
  }, [table, isShowdown, displayStreet, isAutoRunout]);

  useEffect(() => {
    if (!table || !isShowdown) return;
    if (!showdownReveal) return;
    if (isAutoRunout && displayStreet !== "river") return;
    if (showdownResultHandRef.current === table.handId) return;
    showdownResultHandRef.current = table.handId;
    if (showdownResultRef.current !== null) {
      window.clearTimeout(showdownResultRef.current);
    }
    showdownResultRef.current = window.setTimeout(() => {
      setShowdownResult(true);
      showdownResultRef.current = null;
    }, PRESENTATION_DELAYS.showdownResultMs);
    return () => {
      if (showdownResultRef.current !== null) {
        window.clearTimeout(showdownResultRef.current);
        showdownResultRef.current = null;
      }
    };
  }, [table, isShowdown, displayStreet, isAutoRunout, showdownReveal]);

  useEffect(() => {
    if (!table || !game?.handEnded || !showdownResult) {
      setPayoutApplied(false);
      if (payoutTimerRef.current !== null) {
        window.clearTimeout(payoutTimerRef.current);
        payoutTimerRef.current = null;
      }
      return;
    }
    if (payoutTimerRef.current !== null) {
      window.clearTimeout(payoutTimerRef.current);
    }
    payoutTimerRef.current = window.setTimeout(() => {
      setPayoutApplied(true);
      payoutTimerRef.current = null;
    }, PRESENTATION_DELAYS.actionMs);
    return () => {
      if (payoutTimerRef.current !== null) {
        window.clearTimeout(payoutTimerRef.current);
        payoutTimerRef.current = null;
      }
    };
  }, [table?.handId, game?.handEnded, showdownResult]);

  // heartbeat
  useEffect(() => {
    const id = window.setInterval(() => {
      postJson(`${apiBase}/api/rooms/${roomId}/heartbeat`, {}).catch(() => {});
    }, 20000);
    return () => window.clearInterval(id);
  }, [apiBase, roomId]);

  const activeSeatCount =
    room?.seats?.filter((s) => !s.isSittingOut && s.stack > 0).length ?? 0;
  const neededPlayers = Math.max(0, 2 - activeSeatCount);

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
    if (!table || !game?.actionDeadline) {
      setClockTick(0);
      return undefined;
    }
    setClockTick(Date.now());
    const id = window.setInterval(() => {
      setClockTick(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [table, game?.actionDeadline]);

  const clockSeconds = useMemo(() => {
    if (game?.actionDeadline) {
      const now = clockTick || Date.now();
      const remainingMs = game.actionDeadline - now;
      return Math.max(0, Math.ceil(remainingMs / 1000));
    }
    return actionSeconds;
  }, [actionSeconds, clockTick, game?.actionDeadline]);

  // auto-start when enough players and no hand yet
  useEffect(() => {
    if (table) return;
    if (neededPlayers > 0) return;
    if (startSent) return;
    setStartSent(true);
    postJson(`${apiBase}/api/rooms/${roomId}/start`, {}).catch(() => setStartSent(false));
  }, [table, neededPlayers, apiBase, roomId, startSent]);

  // next hand: trigger start request after result popup
  useEffect(() => {
    if (!table || !game?.handEnded) {
      nextHandForRef.current = null;
      if (nextHandTimerRef.current !== null) {
        window.clearTimeout(nextHandTimerRef.current);
        nextHandTimerRef.current = null;
      }
      return;
    }
    if (neededPlayers > 0) return;
    if (nextHandForRef.current === table.handId) return;
    if (isShowdown && !showdownResult) return;
    nextHandForRef.current = table.handId;
    if (nextHandTimerRef.current !== null) {
      window.clearTimeout(nextHandTimerRef.current);
    }
    nextHandTimerRef.current = window.setTimeout(() => {
      postJson(`${apiBase}/api/rooms/${roomId}/start`, {}).catch(() => {
        nextHandForRef.current = null;
      });
      nextHandTimerRef.current = null;
    }, 2000);
    return () => {
      if (nextHandTimerRef.current !== null) {
        window.clearTimeout(nextHandTimerRef.current);
        nextHandTimerRef.current = null;
      }
    };
  }, [table, game?.handEnded, isShowdown, showdownResult, neededPlayers, apiBase, roomId]);

  useEffect(() => {
    if (!foldReserved) return;
    if (!isMyTurn) return;
    if (loading) return;
    if (!actionCtx?.legal) return;
    setFoldReserved(false);
    const autoKind = actionCtx.legal.includes("check") ? "check" : "fold";
    if (!actionCtx.legal.includes(autoKind)) return;
    void sendAction(autoKind);
  }, [foldReserved, isMyTurn, loading, actionCtx?.legal]);

  const sendAction = async (kind: string, overrideAmount?: number) => {
    if (heroSeatIndex < 0) {
      setError("You are not seated in this room.");
      return;
    }
    const action: any = { playerIndex: heroSeatIndex, kind };
    if (kind === "bet" || kind === "raise") {
      action.amount =
        typeof overrideAmount === "number" ? overrideAmount : actionAmount;
    }
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

  const leaveRoom = async () => {
    try {
      await postJson(`${apiBase}/api/rooms/${roomId}/leave`, {});
    } catch (e: any) {
      setError(e?.message ?? String(e));
      return;
    }
    window.localStorage.removeItem("lastRoomId");
    onBack();
  };

  const maxSeats = room?.maxSeats ?? 4;
  const rebuyAmount = room?.config?.initialStackPoints ?? 10000;
  const showRebuyModal = !!(game?.handEnded && heroSeat && heroSeat.stack <= 0);

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

  const payoutContext = useMemo(() => {
    if (!table) {
      return { potTotal: 0, payouts: null as number[] | null };
    }
    const potTotal =
      game?.handSettled?.pot ??
      (table.pots?.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0) ??
        table.game.pot ??
        0);
    if (!isShowdown || !game?.handEnded) {
      return { potTotal, payouts: null as number[] | null };
    }
    const values = showdownInfo.values as (HandValue | null)[];
    const payouts = Array(table.game.players.length).fill(0);
    if (table.autoWin !== null) {
      payouts[table.autoWin] = potTotal;
      return { potTotal, payouts };
    }
    if (table.pots && table.pots.length > 0) {
      for (const sidePot of table.pots) {
        const eligible = sidePot.eligible.filter((idx: number) => values[idx]);
        if (eligible.length === 0) continue;
        let best = values[eligible[0]] as HandValue;
        let potWinners = [eligible[0]];
        for (let i = 1; i < eligible.length; i++) {
          const idx = eligible[i];
          const v = values[idx] as HandValue;
          const cmp = compareHandValues(v, best);
          if (cmp > 0) {
            best = v;
            potWinners = [idx];
          } else if (cmp === 0) {
            potWinners.push(idx);
          }
        }
        const share = Math.floor(sidePot.amount / potWinners.length);
        const remainder = sidePot.amount % potWinners.length;
        potWinners.forEach((idx, wIdx) => {
          payouts[idx] += share + (wIdx === 0 ? remainder : 0);
        });
      }
      return { potTotal, payouts };
    }
    if (showdownInfo.winners.length > 0 && potTotal > 0) {
      const share = Math.floor(potTotal / showdownInfo.winners.length);
      const remainder = potTotal % showdownInfo.winners.length;
      showdownInfo.winners.forEach((idx, wIdx) => {
        payouts[idx] += share + (wIdx === 0 ? remainder : 0);
      });
    }
    return { potTotal, payouts };
  }, [
    table,
    game?.handEnded,
    game?.handSettled?.pot,
    isShowdown,
    showdownInfo.values,
    showdownInfo.winners,
  ]);

  const displayPlayers = useMemo(() => {
    if (!table) return [];
    if (!game?.handEnded || !isShowdown || payoutApplied) {
      return table.game.players;
    }
    if (!payoutContext.payouts) return table.game.players;
    return table.game.players.map(
      (player: (typeof table.game.players)[number], idx: number) => ({
        ...player,
        stack: Math.max(0, player.stack - payoutContext.payouts![idx]),
      })
    );
  }, [table, game?.handEnded, isShowdown, payoutApplied, payoutContext.payouts]);

  const displayPot = useMemo(() => {
    if (!table) return 0;
    if (!game?.handEnded || !isShowdown || payoutApplied) {
      return table.game.pot ?? 0;
    }
    return payoutContext.potTotal;
  }, [table, game?.handEnded, isShowdown, payoutApplied, payoutContext.potTotal]);


  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-5xl flex items-center justify-between">
        <h1 className="text-2xl font-bold">Online Table</h1>
        <button
          onClick={leaveRoom}
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
      {showRebuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-800 p-5 text-center">
            <div className="text-sm font-semibold text-slate-100">Rebuy</div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <input
                type="number"
                value={rebuyAmount}
                readOnly
                className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-center"
              />
              <span className="text-xs text-slate-300">points</span>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={async () => {
                  if (rebuyAmount <= 0 || rebuyLoading) return;
                  setRebuyLoading(true);
                  try {
                    await postJson(`${apiBase}/api/rooms/${roomId}/rebuy`, {
                      amount: rebuyAmount,
                    });
                  } catch (e: any) {
                    setError(e?.message ?? String(e));
                  } finally {
                    setRebuyLoading(false);
                  }
                }}
                disabled={rebuyAmount <= 0 || rebuyLoading}
                className={`px-4 py-1.5 rounded text-sm font-semibold ${
                  rebuyAmount <= 0 || rebuyLoading
                    ? "bg-slate-600 text-slate-300 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                Rebuy
              </button>
              <button
                onClick={leaveRoom}
                className="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
              >
                Exit
              </button>
            </div>
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
              displayPlayers?.[seatIdx] ??
              (seat ? { hand: [], bet: 0, stack: seat.stack, folded: false, allIn: false } : null);
            const shouldAutoMuck =
              !!seat?.autoMuckWhenLosing &&
              isShowdown &&
              !showdownWinners.includes(seatIdx);
            const showCards =
              seatIdx === heroSeatIndex ||
              (isShowdown && showdownReveal && !shouldAutoMuck);
            const isEmpty = !seat;
            const isWinner =
              showdownResult && isShowdown && seat
                ? showdownInfo.winners.includes(seatIdx)
                : false;
            const actionPopup =
              lastAction && lastAction.playerIndex === seatIdx
                ? actionLabel(lastAction)
                : undefined;
            const popupAllowed =
              !lastAction || lastAction.street === displayStreet;
            const resultPopup =
              showdownResult && isShowdown && seat
                ? isWinner
                  ? `WIN\n${getHandDescription(showdownInfo.values[seatIdx])}`
                  : "LOSE"
                : undefined;
            const popup = popupAllowed ? resultPopup ?? actionPopup : undefined;

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
                  {seat ? seat.username : "Empty"}
                </div>
                {player ? (
                  <Seat
                    label={positionLabel(seatIdx, table?.btnIndex ?? 0, table?.game?.players?.length ?? 4)}
                    hand={player.hand ?? []}
                    player={player}
                    isWinner={isWinner}
                    showCards={showCards}
                    isButton={table?.btnIndex === seatIdx}
                    popupText={popup}
                    isActive={
                      showdownResult && isShowdown
                        ? isWinner
                        : displayCurrentPlayer === seatIdx
                    }
                    stackDisplay={stackDisplay}
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
              <BoardArea cards={visibleBoard} pot={displayPot} pots={table?.pots} />
            </div>
          )}
        </div>
      </div>

      {table && (
        <div className="w-full max-w-5xl bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Send Action</div>
            <div className="flex flex-col items-end gap-1">
              <div
                className={`text-sm font-semibold ${
                  isMyTurn ? "text-emerald-300" : "text-slate-500"
                }`}
              >
                Clock: {clockSeconds}s
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={foldReserved}
                  onChange={(e) => setFoldReserved(e.target.checked)}
                />
                Auto Fold
              </label>
            </div>
          </div>
          <RoomActionBar
            currentPlayer={displayCurrentPlayer ?? table.currentPlayer ?? 0}
            legal={actionCtx?.legal ?? []}
            amount={actionAmount}
            onAmountChange={(v) => setActionAmount(v)}
            onAction={(k) => sendAction(k)}
            onAllIn={() => {
              if (!actionCtx) return;
              const allInAmount =
                typeof actionCtx.maxTotal === "number"
                  ? actionCtx.maxTotal
                  : undefined;
              if (typeof allInAmount !== "number") return;
              const kind = actionCtx.legal.includes("bet")
                ? "bet"
                : actionCtx.legal.includes("raise")
                ? "raise"
                : null;
              if (!kind) return;
              setActionAmount(allInAmount);
              void sendAction(kind, allInAmount);
            }}
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

function positionLabel(playerIndex: number, btnIndex: number, playerCount: number) {
  if (playerCount <= 2) {
    return playerIndex === btnIndex ? "BTN" : "BB";
  }
  if (playerCount === 3) {
    if (playerIndex === btnIndex) return "BTN";
    if (playerIndex === (btnIndex + 1) % playerCount) return "UTG";
    return "BB";
  }
  const n = playerCount;
  if (playerIndex === btnIndex) return "BTN";
  if (playerIndex === (btnIndex + 1) % n) return "BB";
  if (playerIndex === (btnIndex + 2) % n) return "UTG";
  return "CO";
}

function getActionContext(table: any, heroSeatIndex: number) {
  if (!table || heroSeatIndex < 0) return null;
  const p = table.game?.players?.[heroSeatIndex];
  if (!p || p.folded || p.allIn || table.street === "showdown") return null;
  const currentBet = table.game?.currentBet ?? 0;
  const lastRaise = table.lastRaise ?? 1;
  const toCall = Math.max(0, currentBet - (p.bet ?? 0));
  const maxTotal = (p.bet ?? 0) + (p.stack ?? 0);
  const minBetTotal = Math.min(Math.max(100, p.bet ?? 0, currentBet), maxTotal);
  const minRaiseTotal = Math.min(
    currentBet === 0 ? minBetTotal : Math.max(currentBet + lastRaise, currentBet + 100),
    maxTotal
  );

  const legal: string[] = [];
  if (toCall === 0) {
    legal.push("check");
    if ((p.stack ?? 0) > 0) legal.push("bet");
  } else {
    legal.push("fold");
    legal.push("call");
    if ((p.stack ?? 0) > toCall && !table.raiseBlocked) legal.push("raise");
  }

  return { toCall, minBetTotal, minRaiseTotal, maxTotal, legal };
}
