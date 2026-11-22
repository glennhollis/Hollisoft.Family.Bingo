import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AudioSettings,
  BingoPattern,
  CallingMode,
  DisplayMode,
  GameSessionState,
  PlaylistGame,
  SavedFamilyCard,
  WinnerBanner,
} from './types/bingo';
import { createInitialSessionState } from './data/defaults';
import {
  CUSTOM_PERM_KEY,
  SAVED_CARDS_KEY,
  broadcastState,
  fetchInitialServerState,
  loadStateLocally,
  subscribeToStateUpdates,
} from './utils/sync';
import { announceBallCalled, announceGameEvent, playSoundCue } from './utils/audio';
import { CallerConsole } from './components/CallerConsole';
import { PlayerDisplay } from './components/PlayerDisplay';

function parseUrlParams() {
  if (typeof window === 'undefined') {
    return { isPlayerDisplay: false, sessionId: 'FAMILY' };
  }
  const params = new URLSearchParams(window.location.search);
  const display = params.get('display');
  const session = (params.get('session') || 'FAMILY')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 32) || 'FAMILY';
  return {
    isPlayerDisplay: display === 'player',
    sessionId: session,
  };
}

export default function App() {
  const [{ isPlayerDisplay, sessionId }] = useState(parseUrlParams);

  const [state, setState] = useState<GameSessionState>(() => {
    const local = loadStateLocally(sessionId);
    if (local) return local;
    return createInitialSessionState(sessionId);
  });

  const [savedCards, setSavedCards] = useState<SavedFamilyCard[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_CARDS_KEY);
      return raw ? (JSON.parse(raw) as SavedFamilyCard[]) : [];
    } catch {
      return [];
    }
  });

  const [customPerms, setCustomPerms] = useState<Record<number, (number | null)[][]>>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_PERM_KEY);
      return raw ? (JSON.parse(raw) as Record<number, (number | null)[][]>) : {};
    } catch {
      return {};
    }
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Player Display sync subscription
  useEffect(() => {
    if (!isPlayerDisplay) {
      // Caller pushes initial state so newly opened Player tabs or server SSE receive it
      broadcastState(stateRef.current);
      return;
    }

    let active = true;
    fetchInitialServerState(sessionId).then((serverState) => {
      if (active && serverState && serverState.updatedAt >= stateRef.current.updatedAt) {
        setState(serverState);
      }
    });

    const unsub = subscribeToStateUpdates(sessionId, (incoming) => {
      setState(incoming);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [isPlayerDisplay, sessionId]);

  const commitState = useCallback((updater: (prev: GameSessionState) => GameSessionState) => {
    setState((prev) => {
      const next = {
        ...updater(prev),
        updatedAt: Date.now(),
      };
      broadcastState(next);
      return next;
    });
  }, []);

  // Call or toggle a specific number (used by Ball Machine manual entry and board clicks)
  const handleCallNumber = useCallback(
    (num: number) => {
      if (num < 1 || num > 75) return;
      const alreadyCalled = stateRef.current.calledNumbers.includes(num);

      if (alreadyCalled) {
        playSoundCue('undo', stateRef.current.audio);
        commitState((prev) => ({
          ...prev,
          calledNumbers: prev.calledNumbers.filter((n) => n !== num),
          winnerBanner: null,
        }));
      } else {
        announceBallCalled(num, stateRef.current.audio);
        commitState((prev) => ({
          ...prev,
          calledNumbers: [...prev.calledNumbers, num],
          winnerBanner: null,
        }));
      }
    },
    [commitState]
  );

  // Random Number Generator draw
  const handleDrawRandomBall = useCallback(() => {
    const calledSet = new Set(stateRef.current.calledNumbers);
    const available: number[] = [];
    for (let i = 1; i <= 75; i++) {
      if (!calledSet.has(i)) available.push(i);
    }
    if (available.length === 0) return;

    const randomIndex = Math.floor(Math.random() * available.length);
    const drawn = available[randomIndex];
    announceBallCalled(drawn, stateRef.current.audio);
    commitState((prev) => ({
      ...prev,
      calledNumbers: [...prev.calledNumbers, drawn],
      winnerBanner: null,
    }));
  }, [commitState]);

  // Auto-draw timer for RNG mode
  useEffect(() => {
    if (isPlayerDisplay) return;
    if (state.callingMode !== 'rng' || state.autoDrawSeconds <= 0) return;
    if (state.calledNumbers.length >= 75 || state.winnerBanner) return;

    const timer = window.setInterval(() => {
      handleDrawRandomBall();
    }, state.autoDrawSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [
    isPlayerDisplay,
    state.callingMode,
    state.autoDrawSeconds,
    state.calledNumbers.length,
    state.winnerBanner,
    handleDrawRandomBall,
  ]);

  const handleUndoLastBall = useCallback(() => {
    if (stateRef.current.calledNumbers.length === 0) return;
    playSoundCue('undo', stateRef.current.audio);
    commitState((prev) => ({
      ...prev,
      calledNumbers: prev.calledNumbers.slice(0, -1),
      winnerBanner: null,
    }));
  }, [commitState]);

  const handleResetBoard = useCallback(() => {
    announceGameEvent('reset', stateRef.current.audio);
    commitState((prev) => ({
      ...prev,
      calledNumbers: [],
      winnerBanner: null,
      autoDrawSeconds: 0,
    }));
  }, [commitState]);

  const handleSetCallingMode = useCallback(
    (mode: CallingMode) => {
      commitState((prev) => ({
        ...prev,
        callingMode: mode,
        autoDrawSeconds: mode === 'manual' ? 0 : prev.autoDrawSeconds,
      }));
    },
    [commitState]
  );

  const handleSetDisplayMode = useCallback(
    (mode: DisplayMode) => {
      commitState((prev) => ({ ...prev, displayMode: mode }));
    },
    [commitState]
  );

  const handleSetAutoDraw = useCallback(
    (seconds: number) => {
      commitState((prev) => ({ ...prev, autoDrawSeconds: seconds }));
    },
    [commitState]
  );

  const handleApplyPatterns = useCallback(
    (patternIds: string[], allowRotations: boolean) => {
      commitState((prev) => ({
        ...prev,
        activePatternIds: patternIds,
        allowRotations,
      }));
    },
    [commitState]
  );

  const handleSaveCustomPattern = useCallback(
    (pattern: BingoPattern) => {
      commitState((prev) => ({
        ...prev,
        customPatterns: [...prev.customPatterns, pattern],
      }));
    },
    [commitState]
  );

  const handleDeleteCustomPattern = useCallback(
    (id: string) => {
      commitState((prev) => ({
        ...prev,
        customPatterns: prev.customPatterns.filter((p) => p.id !== id),
      }));
    },
    [commitState]
  );

  const handleUpdatePlaylist = useCallback(
    (playlist: PlaylistGame[]) => {
      commitState((prev) => ({ ...prev, playlist }));
    },
    [commitState]
  );

  const handleLoadPlaylistGame = useCallback(
    (index: number) => {
      const target = stateRef.current.playlist[index];
      if (!target) return;

      announceGameEvent('newGame', stateRef.current.audio, target.title);

      commitState((prev) => {
        const updatedPlaylist = prev.playlist.map((g, i) => ({
          ...g,
          status:
            i < index
              ? ('completed' as const)
              : i === index
              ? ('active' as const)
              : ('upcoming' as const),
        }));
        return {
          ...prev,
          calledNumbers: [],
          activePatternIds: target.patternIds,
          allowRotations: target.allowRotations,
          callingMode: target.preferredMode,
          currentRoundTitle: target.title,
          currentPrizeNote: target.prizeNote,
          currentPlaylistIndex: index,
          playlist: updatedPlaylist,
          winnerBanner: null,
          autoDrawSeconds: 0,
        };
      });
    },
    [commitState]
  );

  const handleNextPlaylistGame = useCallback(() => {
    const nextIdx = stateRef.current.currentPlaylistIndex + 1;
    if (nextIdx < stateRef.current.playlist.length) {
      handleLoadPlaylistGame(nextIdx);
    }
  }, [handleLoadPlaylistGame]);

  const handleCelebrateWinner = useCallback(
    (banner: WinnerBanner | null) => {
      if (banner) {
        const detail = banner.serial
          ? `Card ${banner.serial}, ${banner.patternName}`
          : banner.patternName;
        announceGameEvent('winner', stateRef.current.audio, detail);
      }
      commitState((prev) => ({
        ...prev,
        winnerBanner: banner,
        autoDrawSeconds: banner ? 0 : prev.autoDrawSeconds,
      }));
    },
    [commitState]
  );

  const handleUpdateAudio = useCallback(
    (audio: AudioSettings) => {
      commitState((prev) => ({ ...prev, audio }));
    },
    [commitState]
  );

  const handleTogglePlayerTheme = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      playerTheme: prev.playerTheme === 'dark' ? 'light' : 'dark',
    }));
  }, [commitState]);

  const handleUpdateEventTitle = useCallback(
    (eventTitle: string) => {
      commitState((prev) => ({ ...prev, eventTitle }));
    },
    [commitState]
  );

  const handleSaveFamilyCard = useCallback((card: SavedFamilyCard) => {
    setSavedCards((prev) => {
      const next = [...prev, card];
      try {
        localStorage.setItem(SAVED_CARDS_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const handleDeleteFamilyCard = useCallback((id: string) => {
    setSavedCards((prev) => {
      const next = prev.filter((c) => c.id !== id);
      try {
        localStorage.setItem(SAVED_CARDS_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const handleImportCustomPerms = useCallback(
    (perms: Record<number, (number | null)[][]>) => {
      setCustomPerms(perms);
      try {
        localStorage.setItem(CUSTOM_PERM_KEY, JSON.stringify(perms));
      } catch {
        // Ignore
      }
    },
    []
  );

  if (isPlayerDisplay) {
    return (
      <PlayerDisplay
        state={state}
        onToggleTheme={() =>
          setState((prev) => ({
            ...prev,
            playerTheme: prev.playerTheme === 'dark' ? 'light' : 'dark',
          }))
        }
      />
    );
  }

  return (
    <CallerConsole
      state={state}
      savedCards={savedCards}
      customPerms={customPerms}
      onCallNumber={handleCallNumber}
      onDrawRandomBall={handleDrawRandomBall}
      onUndoLastBall={handleUndoLastBall}
      onResetBoard={handleResetBoard}
      onSetCallingMode={handleSetCallingMode}
      onSetDisplayMode={handleSetDisplayMode}
      onSetAutoDraw={handleSetAutoDraw}
      onApplyPatterns={handleApplyPatterns}
      onSaveCustomPattern={handleSaveCustomPattern}
      onDeleteCustomPattern={handleDeleteCustomPattern}
      onUpdatePlaylist={handleUpdatePlaylist}
      onLoadPlaylistGame={handleLoadPlaylistGame}
      onNextPlaylistGame={handleNextPlaylistGame}
      onSaveFamilyCard={handleSaveFamilyCard}
      onDeleteFamilyCard={handleDeleteFamilyCard}
      onImportCustomPerms={handleImportCustomPerms}
      onCelebrateWinner={handleCelebrateWinner}
      onUpdateAudio={handleUpdateAudio}
      onTogglePlayerTheme={handleTogglePlayerTheme}
      onUpdateEventTitle={handleUpdateEventTitle}
    />
  );
}
