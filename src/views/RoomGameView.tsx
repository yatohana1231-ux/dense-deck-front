import { useEffect, useMemo, useState } from "react";
import BoardArea from "../components/BoardArea.js";
import Seat from "../components/Seat.js";
import RoomActionBar from "../components/RoomActionBar.js";
import { useRoomState } from "../hooks/useRoomState.js";
import { useAuth } from "../hooks/useAuth.js";

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

  const heroUserId = auth.user?.userId ?? "";
  const heroSeatIndex = room?.seats.findIndex((s) => s.userId === heroUserId) ?? -1;
  const table = game?.table;
  const heroPlayer = table?.game?.players?.[heroSeatIndex];
  const isMyTurn = table?.currentPlayer === heroSeatIndex;
  const actionCtx = table ? getActionContext(table, heroSeatIndex) : null;
  const actionSeconds = room?.config?.actionSeconds ?? 60;
  const visibleBoard = useMemo(() => {
    if (!table) return [];
    const street = table.revealStreet ?? table.street;
    const flop = table.game?.flop ?? [];
    const turn = table.game?.turn ? [table.game.turn] : [];
    const river = table.game?.river ? [table.game.river] : [];
    if (street === "preflop") return [];
    if (street === "flop") return flop;
    if (street === "turn") return [...flop, ...turn];
    return [...flop, ...turn, ...river]; // river or showdown
  }, [table]);

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
    setTurnStartMs(Date.now());
    const id = window.setInterval(() => {
      setClockTick(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [isMyTurn]);

  const clockSeconds = useMemo(() => {
    if (!isMyTurn) return actionSeconds;
    if (!turnStartMs) return actionSeconds;
    const elapsedSec = Math.floor((clockTick - turnStartMs) / 1000);
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
            const showCards = seatIdx === heroSeatIndex || table?.street === "showdown";
            const isEmpty = !seat;

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
                    popupText={undefined}
                    isActive={table?.currentPlayer === seatIdx}
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
            currentPlayer={table.currentPlayer ?? 0}
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
