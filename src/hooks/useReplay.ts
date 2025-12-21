import { useEffect, useState } from "react";
import type { HandRecord } from "../game/history/recorder";

type ReplayState = {
  replayIndex: number;
  isReplaying: boolean;
  togglePlay: () => void;
  reset: () => void;
  start: () => void;
};

export function useReplay(record: HandRecord | null, intervalMs = 900): ReplayState {
  const [replayIndex, setReplayIndex] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);

  // When record changes, reset index and start paused.
  useEffect(() => {
    setReplayIndex(0);
    setIsReplaying(!!record);
  }, [record]);

  // Auto-advance while replaying.
  useEffect(() => {
    if (!record || !isReplaying) return;
    const total = record.actionLog.length;
    if (total === 0) {
      setIsReplaying(false);
      return;
    }

    const timer = window.setInterval(() => {
      setReplayIndex((idx) => {
        const next = Math.min(idx + 1, total - 1);
        if (next === total - 1) {
          // Stop at the end.
          setIsReplaying(false);
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [record, isReplaying, intervalMs]);

  const togglePlay = () => {
    if (!record) return;
    setIsReplaying((v) => !v);
  };

  const reset = () => {
    setReplayIndex(0);
    // stay paused
  };

  const start = () => {
    if (!record) return;
    setReplayIndex(0);
    setIsReplaying(true);
  };

  return { replayIndex, isReplaying, togglePlay, reset, start };
}
