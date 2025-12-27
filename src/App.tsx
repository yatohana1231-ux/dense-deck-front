import { useEffect, useMemo, useRef, useState } from "react";
import BoardArea from "./components/BoardArea";
import HeroActions from "./components/HeroActions";
import Seat from "./components/Seat";
import InfoBar from "./components/InfoBar";
import type { Card as CardType } from "./components/cards";
import TopView from "./views/TopView";
import HistoryView from "./views/HistoryView";
import {
  evaluateBestOfSeven,
  compareHandValues,
  HAND_CATEGORY_LABEL,
  type HandValue,
} from "./game/handEval";
import {
  type ActionKind,
  type PendingAction,
  type Street,
  type TableState,
  applyAction,
  advanceAfterAction,
  createInitialTable,
  makeActionLabel,
  pickAiAction,
} from "./game/table";
import {
  buildHandRecord,
  saveHandRecord,
  type HandRecord,
} from "./game/history/recorder";
import { createRng } from "./game/rng";
import { useHandHistory } from "./hooks/useHandHistory";
import { useAuth } from "./hooks/useAuth";
import AccountView from "./views/AccountView";
import LoginView from "./views/LoginView";
import RegisterView from "./views/RegisterView";
import UsernameChangeView from "./views/UsernameChangeView";
import ResetRequestView from "./views/ResetRequestView";
import ResetFormView from "./views/ResetFormView";
import ReplayView from "./views/ReplayView";
import LogoutConfirmView from "./views/LogoutConfirmView";

const HERO_INDEX = 2 as const;
const PLAYER_COUNT = 4;
const INITIAL_STACK = 100; // 100BB

type PopupState = {
  playerIndex: number;
  text: string;
} | null;

const streetLabel: Record<Street, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

const positionLabel = (playerIndex: number, btnIndex: number) => {
  const n = PLAYER_COUNT;
  if (playerIndex === btnIndex) return "BTN";
  if (playerIndex === (btnIndex + 1) % n) return "BB";
  if (playerIndex === (btnIndex + 2) % n) return "UTG";
  return "CO";
};

function getHandDescription(v?: HandValue | null): string | undefined {
  if (!v) return undefined;
  const base = HAND_CATEGORY_LABEL[v.category];

  switch (v.category) {
    case "one-pair":
      return `${base} ${v.ranks[0]}`;
    case "two-pair":
      if (v.ranks.length >= 2) {
        return `${base} ${v.ranks[0]} and ${v.ranks[1]}`;
      }
      return base;
    case "three-of-a-kind":
      return `${base} ${v.ranks[0]}`;
    case "four-of-a-kind":
      return `${base} ${v.ranks[0]}`;
    default:
      return base;
  }
}

function App() {
  type ViewMode =
    | "top"
    | "game"
    | "history"
    | "replay"
    | "account"
    | "login"
    | "register"
    | "username"
    | "resetRequest"
    | "resetForm"
    | "logoutConfirm";
  const [view, setView] = useState<ViewMode>("top");
  const [table, setTable] = useState<TableState | null>(null);
  const [devShowAll, setDevShowAll] = useState(false);
  const [popup, setPopup] = useState<PopupState>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [streetCooldown, setStreetCooldown] = useState(false);
  const prevStreet = useRef<Street | null>(null);
  const lastRecordedHandId = useRef<string | null>(null);
  const [lastFinishedRecord, setLastFinishedRecord] = useState<HandRecord | null>(null);
  const [postedHandId, setPostedHandId] = useState<string | null>(null);
  const [postStatus, setPostStatus] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const shouldLoadHistory = view === "history";
  const { history, refresh: refreshHistory } = useHandHistory(
    shouldLoadHistory,
    5
  );
  const rngRef = useRef(createRng());
  const animTimeoutRef = useRef<number | null>(null);
  const advanceTimeoutRef = useRef<number | null>(null);
  const [replayRecord, setReplayRecord] = useState<HandRecord | null>(null);
  const auth = useAuth();
  const authReady = auth.ready;
  const isLoggedIn = !!auth.user && !auth.user.isGuest;

  const clearPendingTimers = () => {
    if (animTimeoutRef.current !== null) {
      window.clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = null;
    }
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  };

  const startGame = () => {
    if (!authReady) return;
    clearPendingTimers();
    const initialBtn = Math.floor(rngRef.current.random() * PLAYER_COUNT);
    createInitialTable(PLAYER_COUNT, INITIAL_STACK, initialBtn, rngRef.current).then((next) => {
      prevStreet.current = next.street;
      setTable(next);
      setLastFinishedRecord(null);
      setPostedHandId(null);
      setPostStatus(null);
      setPopup(null);
      setIsAnimating(false);
      setStreetCooldown(false);
      setView("game");
    });
  };

  const handleNewHand = () => {
    if (!authReady) return;
    clearPendingTimers();
    const nextBtn =
      table !== null
        ? (table.btnIndex + 1) % PLAYER_COUNT
        : Math.floor(rngRef.current.random() * PLAYER_COUNT);
    createInitialTable(
      PLAYER_COUNT,
      INITIAL_STACK,
      nextBtn,
      rngRef.current
    ).then((next) => {
      prevStreet.current = next.street;
      setTable(next);
      setLastFinishedRecord(null);
      setPostedHandId(null);
      setPostStatus(null);
      setPopup(null);
      setIsAnimating(false);
      setStreetCooldown(false);
      setView("game");
    });
  };

  const handleViewHands = () => {
    refreshHistory();
    setView("history");
  };

  const startReplay = (record: HandRecord) => {
    setReplayRecord(record);
    setView("replay");
  };

  const fullBoard = useMemo<CardType[]>(() => {
    if (!table) return [];
    const { flop, turn, river } = table.game;
    return [...flop, turn, river];
  }, [table]);

  const visibleBoard = useMemo<CardType[]>(() => {
    if (!table) return [];
    const { street, autoWin } = table;
    const { flop, turn } = table.game;
    if (street === "showdown" && autoWin !== null) {
      return [];
    }
    switch (street) {
      case "preflop":
        return [];
      case "flop":
        return flop;
      case "turn":
        return [...flop, turn];
      case "river":
      case "showdown":
        return fullBoard;
      default:
        return [];
    }
  }, [table, fullBoard]);

  type ShowdownResult = {
    winners: number[];
    values: (HandValue | null)[];
  } | null;

  const showdown: ShowdownResult = useMemo(() => {
    if (!table || table.street !== "showdown") return null;

    if (table.autoWin !== null) {
      return {
        winners: [table.autoWin],
        values: Array(table.game.players.length).fill(null),
      };
    }

    const values: (HandValue | null)[] = [];
    let best: HandValue | null = null;
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
  }, [table, fullBoard]);

  const hero = table?.game.players[HERO_INDEX];
  const isHeroTurn =
    !!table &&
    table.currentPlayer === HERO_INDEX &&
    table.street !== "showdown" &&
    !isAnimating &&
    hero?.allIn !== true &&
    hero?.folded !== true;

  const heroToCall =
    table && hero ? Math.max(0, table.game.currentBet - hero.bet) : 0;
  const heroCanCheck = heroToCall === 0;
  const heroCanBetOrRaise = !!hero && hero.stack > 0;

  const runActionWithAnimation = (action: PendingAction) => {
    if (!table) return;
    if (isAnimating || table.street === "showdown") return;

    const label = makeActionLabel(action.kind, table, action.playerIndex);
    setIsAnimating(true);
    setPopup({ playerIndex: action.playerIndex, text: label });

    clearPendingTimers();
    animTimeoutRef.current = window.setTimeout(() => {
      setTable((prev) => (prev ? applyAction(prev, action) : prev));
      setPopup(null);

      advanceTimeoutRef.current = window.setTimeout(() => {
        setTable((prev) => (prev ? advanceAfterAction(prev) : prev));
        setIsAnimating(false);
      }, 1000);
    }, 1000);
  };

  useEffect(() => {
    if (!table) return;
    if (table.street === "showdown") return;
    if (isAnimating) return;
    if (streetCooldown) return;

    const current = table.game.players[table.currentPlayer];
    if (current.folded || current.allIn) {
      setTable((prev) => (prev ? advanceAfterAction(prev) : prev));
      return;
    }

    if (table.currentPlayer === HERO_INDEX) return;

    const kind = pickAiAction(table, table.currentPlayer, rngRef.current);
    runActionWithAnimation({ playerIndex: table.currentPlayer, kind });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.currentPlayer, table?.street, isAnimating, streetCooldown, table?.game.players]);

  // Add a small delay after the street changes to stagger AI actions.
  useEffect(() => {
    if (!table) return;
    if (prevStreet.current !== table.street) {
      prevStreet.current = table.street;
      setStreetCooldown(true);
      const t = window.setTimeout(() => setStreetCooldown(false), 500);
      return () => window.clearTimeout(t);
    }
  }, [table?.street]);

  // Record hand history on showdown/auto-win (once per hand).
  useEffect(() => {
    if (!table) return;
    if (table.street !== "showdown") return;
    if (lastRecordedHandId.current === table.handId) return;
    const record = buildHandRecord(table, HERO_INDEX);
    saveHandRecord(record);
    setLastFinishedRecord(record);
    setPostedHandId(null);
    lastRecordedHandId.current = table.handId;
  }, [table]);

  useEffect(() => {
    return () => {
      clearPendingTimers();
    };
  }, []);

  const handlePostLastHand = async () => {
    if (!lastFinishedRecord) return;
    setPosting(true);
    setPostStatus(null);
    try {
      const apiBase = import.meta.env.VITE_API_BASE ?? "";
      const heroInitial = lastFinishedRecord.initialStacks[HERO_INDEX] ?? 0;
      const heroFinal = lastFinishedRecord.finalStacks[HERO_INDEX] ?? 0;
      const payload = {
        board: lastFinishedRecord.board,
        boardReserved:
          lastFinishedRecord.boardReserved ?? table?.boardReserved ?? [],
        holeCards: lastFinishedRecord.holeCards,
        initialStacks: lastFinishedRecord.initialStacks,
        finalStacks: lastFinishedRecord.finalStacks,
        actionLog: lastFinishedRecord.actionLog,
        winners: lastFinishedRecord.winners,
        handValues: lastFinishedRecord.handValues,
        seatCount: lastFinishedRecord.seatCount ?? lastFinishedRecord.holeCards.length,
        btnIndex: lastFinishedRecord.btnIndex,
        heroIndex: lastFinishedRecord.heroIndex,
        streetEnded: lastFinishedRecord.streetEnded,
        mode: "superDense",
      };
      const body = {
        handId: lastFinishedRecord.handId,
        tableId: "table-local",
        playerId: "player-local",
        mode: "superDense",
        stakes: { sb: 0, bb: 1 },
        heroSeat: HERO_INDEX,
        heroNetResult: heroFinal - heroInitial,
        winnerCount: lastFinishedRecord.winners.length,
        autoWin: lastFinishedRecord.autoWin ?? false,
        playedAt: new Date(lastFinishedRecord.startedAt).toISOString(),
        payload,
      };
      const res = await fetch(`${apiBase}/api/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      setPostedHandId(lastFinishedRecord.handId);
      setPostStatus("Saved hand to DB");
    } catch (e: any) {
      setPostStatus(`Save failed: ${e?.message ?? e}`);
    } finally {
      setPosting(false);
    }
  };

  const showdownText =
    table && table.street === "showdown" && showdown
      ? `Winner: ${showdown.winners
          .map((i) => (i === HERO_INDEX ? (auth.user?.username ?? `Guest-${auth.user?.userId ?? ""}`) : `Player ${i + 1}`))
          .join(", ")}`
      : undefined;

  const isSeatActive = (idx: number) => {
    if (!table) return false;
    if (table.street === "showdown") {
      return !!showdown?.winners.includes(idx);
    }
    return table.currentPlayer === idx;
  };

  // TOP screen
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex items-center justify-center">
        <div className="text-sm text-slate-300">Loading...</div>
      </div>
    );
  }

  if (view === "top") {
    return (
      <TopView
        onStart={startGame}
        onViewHands={handleViewHands}
        onLogin={() => setView("login")}
        onLogoutRequest={() => setView("logoutConfirm")}
        isLoggedIn={isLoggedIn}
        username={auth.user?.username}
      />
    );
  }

  // History screen
  if (view === "history") {
    return (
      <HistoryView
        history={history}
        username={auth.user?.username}
        onSelectHand={startReplay}
        onBack={() => setView("top")}
      />
    );
  }

  if (view === "replay" && replayRecord) {
    return <ReplayView record={replayRecord} onBack={() => setView("history")} />;
  }

  if (view === "account" && auth.user) {
    return (
      <AccountView
        user={{
          userId: auth.user.userId,
          isGuest: auth.user.isGuest,
          username: auth.user.username,
          usernameChanged: auth.user.usernameChanged,
          email: auth.user.email,
        }}
        onBack={() => setView("top")}
        onLogout={() => auth.logout().then(() => setView("top"))}
        onGotoRegister={() => setView("register")}
        onGotoLogin={() => setView("login")}
        onGotoUsernameChange={() => setView("username")}
      />
    );
  }

  if (view === "login") {
    return (
      <LoginView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        onSuccess={() => {
          auth.refresh();
          setView("top");
        }}
        onBack={() => setView("top")}
        onGoRegister={() => setView("register")}
        onGoReset={() => setView("resetRequest")}
      />
    );
  }

  if (view === "register") {
    return (
      <RegisterView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        onSuccess={() => {
          auth.refresh();
          setView("top");
        }}
        onBack={() => setView("top")}
        onGoLogin={() => setView("login")}
      />
    );
  }

  if (view === "username" && auth.user) {
    return (
      <UsernameChangeView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        user={auth.user}
        onSuccess={() => {
          auth.refresh();
          setView("account");
        }}
        onBack={() => setView("account")}
      />
    );
  }

  if (view === "resetRequest") {
    return (
      <ResetRequestView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        onDone={() => setView("resetForm")}
        onBack={() => setView("login")}
      />
    );
  }

  if (view === "resetForm") {
    return (
      <ResetFormView
        apiBase={import.meta.env.VITE_API_BASE ?? ""}
        onSuccess={() => setView("login")}
        onBack={() => setView("login")}
      />
    );
  }

  if (view === "logoutConfirm" && auth.user) {
    return (
      <LogoutConfirmView
        onConfirm={() =>
          auth.logout().then(() => {
            setView("top");
          })
        }
        onCancel={() => setView("top")}
      />
    );
  }

  if (!table) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 inciso flex justify-center">
      <div className="w-full max-w-3xl p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold mb-1">Dense Deck Poker</h1>
            <p className="text-sm text-slate-300">4-max Dense Deck table UI</p>
          </div>
          <button
            onClick={() => setView("top")}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
          >
            Back to TOP
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="text-sm text-slate-300 min-h-[20px]">
            {postStatus ?? "\u00a0"}
          </div>
          <button
            onClick={handlePostLastHand}
            disabled={
              posting ||
              !lastFinishedRecord ||
              postedHandId === lastFinishedRecord?.handId
            }
            className={`px-3 py-1.5 rounded text-sm font-semibold ${
              posting ||
              !lastFinishedRecord ||
              postedHandId === lastFinishedRecord?.handId
                ? "bg-slate-700 text-slate-400"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {posting
              ? "Saving..."
              : postedHandId === lastFinishedRecord?.handId
                ? "Saved"
                : "Save Hand to DB"}
          </button>
        </div>

        <InfoBar
          streetLabel={streetLabel[table.street]}
          pot={table.game.pot}
          devShowAll={devShowAll}
          onToggleShowAll={() => setDevShowAll((v) => !v)}
          onNewHand={handleNewHand}
          showdownText={showdownText}
        />

        <div className="mt-2 grid grid-cols-[1fr_3fr_1fr] grid-rows-[0.7fr_auto_0.7fr] gap-2 h-[280px] lg:h-[310px]">
          <div className="row-start-1 col-start-2 flex items-center justify-center">
            <Seat
              label={positionLabel(0, table.btnIndex)}
              hand={table.game.players[0].hand}
              player={table.game.players[0]}
              isWinner={!!showdown?.winners.includes(0)}
            handDescription={
              showdown ? getHandDescription(showdown.values[0]) : undefined
            }
            showCards={
              devShowAll ||
              (table.street === "showdown" && !table.game.players[0].folded)
            }
            isButton={table.btnIndex === 0}
            popupText={popup?.playerIndex === 0 ? popup.text : undefined}
            isActive={isSeatActive(0)}
          />
        </div>

          <div className="row-start-2 col-start-1 col-span-3 flex items-center justify-center">
            <BoardArea cards={visibleBoard} pot={table.game.pot} />
          </div>

          <div className="row-start-2 col-start-1 flex items-start justify-center mt-1">
            <Seat
            label={positionLabel(3, table.btnIndex)}
            hand={table.game.players[3].hand}
            player={table.game.players[3]}
            isWinner={!!showdown?.winners.includes(3)}
            handDescription={
              showdown ? getHandDescription(showdown.values[3]) : undefined
            }
            showCards={
              devShowAll ||
              (table.street === "showdown" && !table.game.players[3].folded)
            }
            isButton={table.btnIndex === 3}
            popupText={popup?.playerIndex === 3 ? popup.text : undefined}
            isActive={isSeatActive(3)}
          />
        </div>

          <div className="row-start-2 col-start-3 flex items-start justify-center mt-1">
            <Seat
            label={positionLabel(1, table.btnIndex)}
            hand={table.game.players[1].hand}
            player={table.game.players[1]}
            isWinner={!!showdown?.winners.includes(1)}
            handDescription={
              showdown ? getHandDescription(showdown.values[1]) : undefined
            }
            showCards={
              devShowAll ||
              (table.street === "showdown" && !table.game.players[1].folded)
            }
            isButton={table.btnIndex === 1}
            popupText={popup?.playerIndex === 1 ? popup.text : undefined}
            isActive={isSeatActive(1)}
          />
        </div>

          <div className="row-start-3 col-start-2 flex flex-col items-center justify-center gap-3">
            <Seat
            label={`${
              auth.user?.isGuest
                ? `Guest-${auth.user?.userId ?? ""}`
                : auth.user?.username ?? "You"
            } (${positionLabel(HERO_INDEX, table.btnIndex)})`}
              hand={table.game.players[HERO_INDEX].hand}
              player={table.game.players[HERO_INDEX]}
            isHero
            isWinner={!!showdown?.winners.includes(HERO_INDEX)}
            handDescription={
              showdown
                ? getHandDescription(showdown.values?.[HERO_INDEX])
                : undefined
            }
            showCards
            isButton={table.btnIndex === HERO_INDEX}
            popupText={
              popup?.playerIndex === HERO_INDEX ? popup.text : undefined
            }
            isActive={isSeatActive(HERO_INDEX)}
          />

            <HeroActions
              isHeroTurn={isHeroTurn}
              heroCanCheck={heroCanCheck}
              heroCanBetOrRaise={heroCanBetOrRaise}
              currentBet={table.game.currentBet}
              toCall={heroToCall}
              onFold={() =>
                runActionWithAnimation({
                  playerIndex: HERO_INDEX,
                  kind: "fold",
                })
              }
              onCheckOrCall={() =>
                runActionWithAnimation({
                  playerIndex: HERO_INDEX,
                  kind: heroCanCheck ? "check" : ("call" as ActionKind),
                })
              }
              onBetOrRaise={() =>
                runActionWithAnimation({
                  playerIndex: HERO_INDEX,
                  kind:
                    table.game.currentBet === 0
                      ? "bet"
                      : ("raise" as ActionKind),
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
