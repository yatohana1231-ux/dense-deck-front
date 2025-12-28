import { useEffect, useState } from "react";
import { useRoomState } from "../hooks/useRoomState.js";
import Seat from "../components/Seat.js";
import BoardArea from "../components/BoardArea.js";
import RoomActionBar from "../components/RoomActionBar.js";
import { useAuth } from "../hooks/useAuth.js";

type Props = {
  apiBase: string;
  roomId: string;
  onBack: () => void;
  onEnterTable: () => void;
};

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export default function RoomDetailView({ apiBase, roomId, onBack, onEnterTable }: Props) {
  const { room, game, error: wsError } = useRoomState(apiBase, roomId);
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionAmount, setActionAmount] = useState<number>(0);
  const heroUserId = auth.user?.userId ?? "";
  const heroSeatIndex = room?.seats.findIndex((s) => s.userId === heroUserId) ?? -1;
  const table = game?.table;
  const heroPlayer = table?.game?.players?.[heroSeatIndex];
  const isMyTurn = table?.currentPlayer === heroSeatIndex;
  const actionCtx = table ? getActionContext(table, heroSeatIndex) : null;
  const isSeated = heroSeatIndex >= 0;
  const maxSeats = room?.maxSeats ?? 4;
  const seatCount = room?.seats?.length ?? 0;
  const neededPlayers = Math.max(0, 2 - seatCount);
  const canStart =
    seatCount >= 2 && (room?.state === "WAITING" || room?.state === "STARTING");

  // heartbeat every 20s
  useEffect(() => {
    const id = window.setInterval(() => {
      postJson(`${apiBase}/api/rooms/${roomId}/heartbeat`, {}).catch(() => {});
    }, 20000);
    return () => window.clearInterval(id);
  }, [apiBase, roomId]);

  const join = async () => {
    setLoading(true);
    try {
      await postJson(`${apiBase}/api/rooms/${roomId}/join`, {});
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const leave = async () => {
    setLoading(true);
    try {
      await postJson(`${apiBase}/api/rooms/${roomId}/leave`, {});
      setError(null);
      onBack();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    setLoading(true);
    try {
      if (!canStart) {
        throw new Error("Need at least 2 seated players to start");
      }
      await postJson(`${apiBase}/api/rooms/${roomId}/start`, {});
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const sendAction = async (kind: string) => {
    if (heroSeatIndex < 0) {
      setError("You are not seated in this room.");
      return;
    }
    const action: any = {
      playerIndex: heroSeatIndex,
      kind,
    };
    if (kind === "bet" || kind === "raise") {
      action.amount = actionAmount;
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

  // auto-set action defaults on turn change
  useEffect(() => {
    if (!table || heroSeatIndex < 0 || !isMyTurn || !actionCtx) return;
    if (actionCtx.toCall === 0) {
      if (actionCtx.legal.includes("bet")) {
        setActionAmount(actionCtx.minBetTotal ?? 0);
      }
    } else {
      if (actionCtx.legal.includes("call")) {
        setActionAmount(actionCtx.toCall);
      }
      if (actionCtx.legal.includes("raise")) {
        setActionAmount(actionCtx.minRaiseTotal ?? actionCtx.toCall);
      }
    }
  }, [table?.currentPlayer, table?.game?.currentBet, table?.game?.players, heroSeatIndex, isMyTurn, actionCtx]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Room Detail</h1>
          <p className="text-xs text-slate-400">ID: {roomId}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
          >
            Back
          </button>
          <button
            onClick={leave}
            disabled={loading}
            className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-sm font-semibold"
          >
            Leave
          </button>
        </div>
      </div>

      {(error || wsError) && <div className="text-sm text-rose-400">{error ?? wsError}</div>}

      <div className="w-full max-w-4xl bg-slate-800/50 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{room?.name ?? "..."}</div>
            <div className="text-xs text-slate-400">
              {room?.tag} / {room?.state} / {room?.seats.length ?? 0}/{room?.maxSeats ?? 0} seats
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={join}
              disabled={loading || isSeated}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSeated ? "Joined" : "Join"}
            </button>
            <button
              onClick={onEnterTable}
              disabled={!isSeated}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enter Table
            </button>
            <button
              onClick={start}
              disabled={loading || !canStart}
              className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div>Initial Stack: {room?.config.initialStackBB ?? 0} BB</div>
          <div>Action Timer: {room?.config.actionSeconds ?? 0}s</div>
          <div>Reconnect Grace: {room?.config.reconnectGraceSeconds ?? 0}s</div>
          <div>Rebuy: {room?.config.rebuyAmount ?? 0} BB</div>
        </div>
        {!canStart && (
          <div className="mt-2 text-xs text-amber-300">
            Need {neededPlayers} more player{neededPlayers === 1 ? "" : "s"} seated to start a hand.
          </div>
        )}

        <div className="mt-4">
          <div className="text-sm font-semibold mb-1">Seats</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Array.from({ length: maxSeats }).map((_, idx) => {
              const seat = room?.seats?.find((s) => s.seatIndex === idx);
              return (
                <div
                  key={idx}
                  className="p-2 rounded bg-slate-700/50 border border-slate-700 flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold">
                      {seat ? seat.username : `Empty Seat ${idx}`}
                    </div>
                    <div className="text-xs text-slate-400">
                      Stack: {seat?.stack ?? 0} / Seat: {idx}
                    </div>
                  </div>
                  {!seat && (
                    <div className="text-[10px] text-slate-500 italic">waiting...</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {game ? (
        <div className="w-full max-w-4xl bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <div className="text-sm font-semibold mb-2">In Hand</div>
            <div className="text-xs text-slate-300">
              Street: {game.table?.street} / Pot: {game.table?.game?.pot ?? 0} / CurrentBet:{" "}
              {game.table?.game?.currentBet ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">Deadline: {new Date(game.actionDeadline).toLocaleTimeString()}</div>
            <div className="mt-2 text-xs text-slate-300">
              CurrentPlayer: {game.table?.currentPlayer ?? "-"} / BTN: {game.table?.btnIndex ?? "-"}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              You:{" "}
              {heroSeatIndex >= 0
                ? `${room?.seats[heroSeatIndex]?.username ?? "You"} (Seat ${heroSeatIndex})`
                : "Not seated"}
            </div>

          <div className="mt-3">
            <div className="text-sm font-semibold mb-1">Players</div>
            <div className="grid grid-cols-[1fr_3fr_1fr] grid-rows-[0.7fr_auto_0.7fr] gap-2 h-[280px] lg:h-[310px]">
              <div className="row-start-1 col-start-2 flex items-center justify-center">
                <Seat
                  label="P0"
                  hand={game.table?.game?.players?.[0]?.hand ?? []}
                  player={game.table?.game?.players?.[0] ?? { hand: [], bet: 0, stack: 0, folded: false, allIn: false }}
                  isWinner={false}
                  handDescription={undefined}
                  showCards
                  isButton={game.table?.btnIndex === 0}
                  popupText={undefined}
                  isActive={game.table?.currentPlayer === 0}
                />
              </div>
              <div className="row-start-2 col-start-1 col-span-3 flex items-center justify-center">
                <BoardArea cards={game.table?.game?.flop ?? []} pot={game.table?.game?.pot ?? 0} />
              </div>
              <div className="row-start-2 col-start-1 flex items-start justify-center mt-1">
                <Seat
                  label="P3"
                  hand={game.table?.game?.players?.[3]?.hand ?? []}
                  player={game.table?.game?.players?.[3] ?? { hand: [], bet: 0, stack: 0, folded: false, allIn: false }}
                  isWinner={false}
                  handDescription={undefined}
                  showCards
                  isButton={game.table?.btnIndex === 3}
                  popupText={undefined}
                  isActive={game.table?.currentPlayer === 3}
                />
              </div>
              <div className="row-start-2 col-start-3 flex items-start justify-center mt-1">
                <Seat
                  label="P1"
                  hand={game.table?.game?.players?.[1]?.hand ?? []}
                  player={game.table?.game?.players?.[1] ?? { hand: [], bet: 0, stack: 0, folded: false, allIn: false }}
                  isWinner={false}
                  handDescription={undefined}
                  showCards
                  isButton={game.table?.btnIndex === 1}
                  popupText={undefined}
                  isActive={game.table?.currentPlayer === 1}
                />
              </div>
              <div className="row-start-3 col-start-2 flex flex-col items-center justify-center gap-3">
                <Seat
                  label={`P2`}
                  hand={game.table?.game?.players?.[2]?.hand ?? []}
                  player={game.table?.game?.players?.[2] ?? { hand: [], bet: 0, stack: 0, folded: false, allIn: false }}
                  isHero
                  isWinner={false}
                  handDescription={undefined}
                  showCards
                  isButton={game.table?.btnIndex === 2}
                  popupText={undefined}
                  isActive={game.table?.currentPlayer === 2}
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold mb-1">Send Action</div>
            <RoomActionBar
              currentPlayer={game.table?.currentPlayer ?? 0}
              legal={actionCtx?.legal ?? []}
              amount={actionAmount}
              onAmountChange={(v) => setActionAmount(v)}
              onAction={(k) => {
                sendAction(k);
              }}
              disabled={loading || !isMyTurn || heroSeatIndex < 0}
              toCall={actionCtx?.toCall}
              minBetTotal={actionCtx?.minBetTotal}
              minRaiseTotal={actionCtx?.minRaiseTotal}
              stack={heroPlayer?.stack}
            />
            {!isMyTurn && (
              <div className="mt-1 text-xs text-slate-400">
                Waiting for seat {game.table?.currentPlayer} to act.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-5xl bg-slate-800/30 rounded-lg border border-slate-700 p-4">
          <div className="text-sm font-semibold mb-2">Waiting for players</div>
          <div className="text-xs text-amber-300 mb-3">
            Need {neededPlayers} more player{neededPlayers === 1 ? "" : "s"} seated to start a hand.
          </div>
          <WaitingTable
            seats={room?.seats ?? []}
            maxSeats={maxSeats}
            heroSeatIndex={heroSeatIndex}
          />
        </div>
      )}
    </div>
  );
}

type WaitingTableProps = {
  seats: { seatIndex: number; username: string; stack: number }[];
  maxSeats: number;
  heroSeatIndex: number;
};

function WaitingTable({ seats, maxSeats, heroSeatIndex }: WaitingTableProps) {
  // seat 0: bottom, 1: right, 2: top, 3: left
  const positions = [
    { label: "You", className: "absolute bottom-4 left-1/2 -translate-x-1/2" },
    { label: "BTN", className: "absolute top-1/2 right-4 -translate-y-1/2" },
    { label: "CO", className: "absolute top-4 left-1/2 -translate-x-1/2" },
    { label: "UTG", className: "absolute top-1/2 left-4 -translate-y-1/2" },
  ];
  return (
    <div className="relative w-full max-w-5xl aspect-[16/9] bg-slate-800/40 border border-slate-700 rounded-lg overflow-hidden">
      <div className="absolute inset-1/4 bg-emerald-900/50 border border-emerald-700 rounded-lg flex items-center justify-center text-emerald-100 text-sm">
        Waiting for more players...
      </div>
      {Array.from({ length: maxSeats }).map((_, idx) => {
        const pos = positions[idx] ?? { label: `Seat ${idx}`, className: "absolute" };
        const seat = seats.find((s) => s.seatIndex === idx);
        const occupied = !!seat;
        const isHero = idx === heroSeatIndex;
        return (
          <div
            key={idx}
            className={`${pos.className} flex flex-col items-center gap-1`}
          >
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                occupied ? "bg-slate-700 text-slate-100" : "bg-slate-700/40 text-slate-400"
              }`}
            >
              {occupied ? seat?.username : pos.label}
            </div>
            <div
              className={`w-20 h-28 rounded-xl border ${
                occupied
                  ? "border-slate-600 bg-slate-700/60"
                  : "border-slate-700 bg-slate-800/40"
              } ${isHero ? "ring-2 ring-emerald-400/60" : ""}`}
            />
          </div>
        );
      })}
    </div>
  );
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
