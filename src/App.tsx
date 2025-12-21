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
import { useReplay } from "./hooks/useReplay";
import { useHandHistory } from "./hooks/useHandHistory";

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
  type ViewMode = "top" | "game" | "history";
  const [view, setView] = useState<ViewMode>("top");
  const [table, setTable] = useState<TableState | null>(null);
  const [devShowAll, setDevShowAll] = useState(false);
  const [popup, setPopup] = useState<PopupState>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [streetCooldown, setStreetCooldown] = useState(false);
  const prevStreet = useRef<Street | null>(null);
  const lastRecordedHandId = useRef<string | null>(null);
  const shouldLoadHistory = view === "history";
  const { history, refresh: refreshHistory } = useHandHistory(
    shouldLoadHistory,
    5
  );
  const rngRef = useRef(createRng());
  const [replayRecord, setReplayRecord] = useState<HandRecord | null>(null);
  const { replayIndex, isReplaying, togglePlay, reset } = useReplay(replayRecord);
  const animTimeoutRef = useRef<number | null>(null);
  const advanceTimeoutRef = useRef<number | null>(null);

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
    clearPendingTimers();
    const initialBtn = Math.floor(rngRef.current.random() * PLAYER_COUNT);
    createInitialTable(PLAYER_COUNT, INITIAL_STACK, initialBtn, rngRef.current).then((next) => {
      prevStreet.current = next.street;
      setTable(next);
      setPopup(null);
      setIsAnimating(false);
      setStreetCooldown(false);
      setView("game");
    });
  };

  const handleNewHand = () => {
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
    lastRecordedHandId.current = table.handId;
  }, [table]);

  useEffect(() => {
    return () => {
      clearPendingTimers();
    };
  }, []);

  const showdownText =
    table && table.street === "showdown" && showdown
      ? `Winner: ${showdown.winners
          .map((i) => (i === HERO_INDEX ? "You" : `Player ${i + 1}`))
          .join(", ")}`
      : undefined;

  // TOP screen
  if (view === "top") {
    return <TopView onStart={startGame} onViewHands={handleViewHands} />;
  }

  // History screen
  if (view === "history") {
    return (
      <HistoryView
        history={history}
        replayRecord={replayRecord}
        replayIndex={replayIndex}
        isReplaying={isReplaying}
        onSelectHand={startReplay}
        onTogglePlay={togglePlay}
        onReset={reset}
        onBack={() => setView("top")}
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
            />
          </div>

          <div className="row-start-3 col-start-2 flex flex-col items-center justify-center gap-3">
            <Seat
              label={`You (${positionLabel(HERO_INDEX, table.btnIndex)})`}
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
