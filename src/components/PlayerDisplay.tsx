import { useState } from 'react';
import { Award, Maximize2, Minimize2, Moon, Sun } from 'lucide-react';
import type { BingoPattern, GameSessionState } from '../types/bingo';
import { PRESET_PATTERNS, getColumnColorClasses, getLetterForNumber } from '../data/patterns';
import { Flashboard } from './Flashboard';
import { PatternMatrix } from './PatternMatrix';

interface PlayerDisplayProps {
  state: GameSessionState;
  onToggleTheme?: () => void;
  embedded?: boolean;
}

export function PlayerDisplay({ state, onToggleTheme, embedded = false }: PlayerDisplayProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const allPatterns: BingoPattern[] = [...PRESET_PATTERNS, ...state.customPatterns];
  const activePatterns = state.activePatternIds
    .map((id) => allPatterns.find((p) => p.id === id))
    .filter((p): p is BingoPattern => Boolean(p));

  const lastBall =
    state.calledNumbers.length > 0
      ? state.calledNumbers[state.calledNumbers.length - 1]
      : null;
  const recentBalls = state.calledNumbers.slice(-5, -1).reverse();

  const isDark = state.playerTheme === 'dark';

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      className={`${
        embedded ? 'rounded-2xl border overflow-hidden' : 'min-h-screen'
      } flex flex-col justify-between p-4 sm:p-6 lg:p-8 transition-colors relative ${
        isDark
          ? 'bg-[#0B1220] text-slate-100 border-slate-800'
          : 'bg-[#F4F5F7] text-slate-900 border-slate-200'
      }`}
    >
      {/* Winner Celebration Overlay */}
      {state.winnerBanner && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-xs">
          <div className="max-w-xl w-full rounded-2xl border-2 border-amber-400 bg-slate-900 text-white p-8 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center mx-auto">
              <Award className="w-9 h-9" />
            </div>
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-300">
              Verified Winner
            </div>
            <h2 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight">
              BINGO!
            </h2>
            <p className="text-lg font-semibold text-emerald-300">
              {state.winnerBanner.patternName}
            </p>
            {(state.winnerBanner.serial || state.winnerBanner.cardLabel) && (
              <div className="text-sm text-slate-300 font-mono-num">
                {state.winnerBanner.cardLabel ? `${state.winnerBanner.cardLabel} · ` : ''}
                {state.winnerBanner.serial ? `Card #${state.winnerBanner.serial}` : ''}
              </div>
            )}
            <p className="text-xs text-slate-400 pt-2">
              Waiting for caller to clear banner or start the next round.
            </p>
          </div>
        </div>
      )}

      {/* Top Strip: Event, Round & Display Controls */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-current/10">
        <div className="min-w-0">
          <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {state.eventTitle}
            {state.currentPrizeNote ? ` · Prize: ${state.currentPrizeNote}` : ''}
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight truncate">
            {state.currentRoundTitle}
          </h1>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Balls Called
            </div>
            <div className="text-2xl font-mono-num font-bold">
              {state.calledNumbers.length} <span className="text-sm font-normal opacity-60">/ 75</span>
            </div>
          </div>

          {!embedded && (
            <div className="flex items-center gap-1.5">
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label="Toggle TV dark or light theme"
                  className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label="Toggle fullscreen"
                className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content: Left Current Ball + Qualifying Patterns, Right 75-Number Flashboard */}
      <div className="my-auto py-4 grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Current Ball + Recent + Qualifying Bingos */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          {/* Current Ball Callout */}
          <div
            className={`rounded-2xl border p-6 flex flex-col items-center justify-center text-center ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Current Ball
            </div>

            {lastBall !== null ? (
              (() => {
                const letter = getLetterForNumber(lastBall);
                const colors = getColumnColorClasses(letter);
                return (
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full ${colors.bg} text-white flex flex-col items-center justify-center shadow-lg border-4 border-white/25`}
                    >
                      <span className="font-display font-extrabold text-3xl sm:text-4xl leading-none">
                        {letter}
                      </span>
                      <span className="font-mono-num font-extrabold text-6xl sm:text-7xl leading-none mt-1">
                        {lastBall}
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-dashed border-current/20 flex items-center justify-center">
                <span className="text-sm font-medium opacity-60">Ready to Start</span>
              </div>
            )}

            {/* Recent Balls */}
            <div className="w-full mt-5 pt-4 border-t border-current/10">
              <div className={`text-[11px] font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Previous Calls
              </div>
              <div className="flex items-center justify-center gap-2 min-h-[38px]">
                {recentBalls.length === 0 ? (
                  <span className="text-xs opacity-45">No previous balls yet</span>
                ) : (
                  recentBalls.map((num) => {
                    const letter = getLetterForNumber(num);
                    const colors = getColumnColorClasses(letter);
                    return (
                      <div
                        key={num}
                        className={`px-3 py-1.5 rounded-lg font-mono-num font-bold text-sm text-white ${colors.bg}`}
                      >
                        {letter}-{num}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Qualifying Patterns Box */}
          <div
            className={`rounded-2xl border p-5 flex-1 flex flex-col justify-center ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider opacity-80">
                Qualifying Bingo{activePatterns.length > 1 ? 's' : ''}
              </h2>
              {state.allowRotations && (
                <span className="text-xs font-semibold text-amber-400">
                  Rotations Allowed
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5">
              {activePatterns.map((pattern) => (
                <div key={pattern.id} className="flex flex-col items-center gap-2 text-center">
                  <PatternMatrix
                    pattern={pattern}
                    allowRotations={state.allowRotations}
                    size={activePatterns.length > 2 ? 'sm' : 'md'}
                    theme={isDark ? 'dark' : 'light'}
                  />
                  <div className="text-sm font-bold">{pattern.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Full 75-Number Flashboard */}
        <div className="xl:col-span-8 flex items-center">
          <Flashboard
            calledNumbers={state.calledNumbers}
            theme={isDark ? 'dark' : 'light'}
          />
        </div>
      </div>

      {/* Footer Info */}
      <footer className={`pt-3 border-t border-current/10 flex flex-wrap items-center justify-between gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <span>
          {state.callingMode === 'manual' ? 'Ball Machine Live Entry' : 'Digital Random Number Generator'}
          {' · '}
          Session {state.sessionId}
        </span>
        <span>
          Game {state.currentPlaylistIndex + 1} of {state.playlist.length}
        </span>
      </footer>
    </div>
  );
}
