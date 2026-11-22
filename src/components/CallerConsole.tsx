import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  Dices,
  ExternalLink,
  Layers,
  ListMusic,
  Monitor,
  MonitorSmartphone,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  SkipForward,
  SlidersHorizontal,
  TicketCheck,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  AudioSettings,
  BingoPattern,
  CallingMode,
  DisplayMode,
  GameSessionState,
  PlaylistGame,
  SavedFamilyCard,
  WinnerBanner,
} from '../types/bingo';
import {
  PRESET_PATTERNS,
  evaluateCardAgainstPatterns,
  getColumnColorClasses,
  getLetterForNumber,
} from '../data/patterns';
import { generatePermCard } from '../utils/permEngine';
import { Flashboard } from './Flashboard';
import { PatternMatrix } from './PatternMatrix';
import { PatternSelectorModal } from './PatternSelectorModal';
import { PlaylistPanel } from './PlaylistPanel';
import { TicketChecker } from './TicketChecker';
import { PrintCardsView } from './PrintCardsView';
import { AudioSettingsModal } from './AudioSettingsModal';
import { PlayerDisplay } from './PlayerDisplay';
import { playSoundCue } from '../utils/audio';

type ActiveTab = 'board' | 'playlist' | 'ticket' | 'print';

interface CallerConsoleProps {
  state: GameSessionState;
  savedCards: SavedFamilyCard[];
  customPerms: Record<number, (number | null)[][]>;
  onCallNumber: (num: number) => void;
  onDrawRandomBall: () => void;
  onUndoLastBall: () => void;
  onResetBoard: () => void;
  onSetCallingMode: (mode: CallingMode) => void;
  onSetDisplayMode: (mode: DisplayMode) => void;
  onSetAutoDraw: (seconds: number) => void;
  onApplyPatterns: (patternIds: string[], allowRotations: boolean) => void;
  onSaveCustomPattern: (pattern: BingoPattern) => void;
  onDeleteCustomPattern: (id: string) => void;
  onUpdatePlaylist: (playlist: PlaylistGame[]) => void;
  onLoadPlaylistGame: (index: number) => void;
  onNextPlaylistGame: () => void;
  onSaveFamilyCard: (card: SavedFamilyCard) => void;
  onDeleteFamilyCard: (id: string) => void;
  onImportCustomPerms: (perms: Record<number, (number | null)[][]>) => void;
  onCelebrateWinner: (banner: WinnerBanner | null) => void;
  onUpdateAudio: (audio: AudioSettings) => void;
  onTogglePlayerTheme: () => void;
  onUpdateEventTitle: (title: string) => void;
}

export function CallerConsole({
  state,
  savedCards,
  customPerms,
  onCallNumber,
  onDrawRandomBall,
  onUndoLastBall,
  onResetBoard,
  onSetCallingMode,
  onSetDisplayMode,
  onSetAutoDraw,
  onApplyPatterns,
  onSaveCustomPattern,
  onDeleteCustomPattern,
  onUpdatePlaylist,
  onLoadPlaylistGame,
  onNextPlaylistGame,
  onSaveFamilyCard,
  onDeleteFamilyCard,
  onImportCustomPerms,
  onCelebrateWinner,
  onUpdateAudio,
  onTogglePlayerTheme,
  onUpdateEventTitle,
}: CallerConsoleProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('board');
  const [patternModalOpen, setPatternModalOpen] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [manualNumberInput, setManualNumberInput] = useState('');
  const [manualInputError, setManualInputError] = useState<string | null>(null);
  const [copiedPlayerUrl, setCopiedPlayerUrl] = useState(false);
  const [showSinglePreviewModal, setShowSinglePreviewModal] = useState(false);

  // Quick Serial Check widget state right on Caller Board
  const [quickSerial, setQuickSerial] = useState('');

  const manualInputRef = useRef<HTMLInputElement | null>(null);

  const allPatterns = useMemo(
    () => [...PRESET_PATTERNS, ...state.customPatterns],
    [state.customPatterns]
  );

  const activePatterns = useMemo(
    () =>
      state.activePatternIds
        .map((id) => allPatterns.find((p) => p.id === id))
        .filter((p): p is BingoPattern => Boolean(p)),
    [state.activePatternIds, allPatterns]
  );

  const lastBall =
    state.calledNumbers.length > 0
      ? state.calledNumbers[state.calledNumbers.length - 1]
      : null;
  const recentBalls = state.calledNumbers.slice(-6, -1).reverse();
  const remainingCount = 75 - state.calledNumbers.length;

  const playerUrl = useMemo(() => {
    if (typeof window === 'undefined') return '?display=player';
    const url = new URL(window.location.href);
    url.searchParams.set('display', 'player');
    url.searchParams.set('session', state.sessionId);
    return url.toString();
  }, [state.sessionId]);

  const handleCopyPlayerUrl = () => {
    navigator.clipboard?.writeText(playerUrl).then(() => {
      setCopiedPlayerUrl(true);
      window.setTimeout(() => setCopiedPlayerUrl(false), 2000);
    }).catch(() => {});
  };

  // Spacebar shortcut to draw next ball in RNG mode on Caller Board
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'board' || state.callingMode !== 'rng') return;
      if (patternModalOpen || audioModalOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        onDrawRandomBall();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, state.callingMode, patternModalOpen, audioModalOpen, onDrawRandomBall]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualNumberInput.trim().replace(/^[BINGObingo]-\s*/, '');
    const num = Number(cleaned);
    if (!Number.isInteger(num) || num < 1 || num > 75) {
      setManualInputError('Enter a ball number from 1 to 75.');
      return;
    }
    setManualInputError(null);
    onCallNumber(num);
    setManualNumberInput('');
    manualInputRef.current?.focus();
  };

  // Quick Serial Checker calculation
  const quickCheckResult = useMemo(() => {
    const trimmed = quickSerial.trim();
    if (!trimmed) return null;
    const saved = savedCards.find(
      (c) => c.serialCode.toLowerCase() === trimmed.toLowerCase()
    );
    const num = Number(trimmed.replace(/^#/, ''));
    const perm = !saved && Number.isFinite(num) && num >= 1 ? generatePermCard(num, 'standard-9000') : null;
    const grid = saved?.grid || perm?.grid || null;
    if (!grid) return { notFound: true as const };

    const evalRes = evaluateCardAgainstPatterns(
      grid,
      state.calledNumbers,
      activePatterns,
      state.allowRotations
    );
    return {
      notFound: false as const,
      label: saved ? saved.label : `Serial #${perm?.serial}`,
      evalRes,
    };
  }, [quickSerial, savedCards, state.calledNumbers, activePatterns, state.allowRotations]);

  const nextPlaylistIndex =
    state.currentPlaylistIndex + 1 < state.playlist.length
      ? state.currentPlaylistIndex + 1
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F5F7] text-slate-900">
      {/* Top Bar: Strict 3-zone contract */}
      <header className="no-print bg-white border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#board"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('board');
          }}
          className="font-display font-extrabold text-xl tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Family Bingo Hall
        </a>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold">
          {[
            { id: 'board', label: 'Caller Board' },
            { id: 'playlist', label: 'Playlist' },
            { id: 'ticket', label: 'Ticket Check' },
            { id: 'print', label: 'Print Cards' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="shrink-0">
          <a
            href={playerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Player Screen
          </a>
        </div>
      </header>

      {/* Mobile Nav Strip */}
      <div className="no-print md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'board', label: 'Caller Board' },
          { id: 'playlist', label: 'Playlist' },
          { id: 'ticket', label: 'Ticket Check' },
          { id: 'print', label: 'Print Cards' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Workspace Control Toolbar (Display Mode, Calling Mode, Audio Controls, Player Link) */}
      <div className="no-print bg-white border-b border-slate-200 px-4 sm:px-8 py-2.5">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Display Mode Switch */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => onSetDisplayMode('multi')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  state.displayMode === 'multi'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Multi-Display
              </button>
              <button
                type="button"
                onClick={() => onSetDisplayMode('single')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  state.displayMode === 'single'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MonitorSmartphone className="w-3.5 h-3.5" />
                Single Display
              </button>
            </div>

            {/* Calling Mode Switch */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => onSetCallingMode('rng')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  state.callingMode === 'rng'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Dices className="w-3.5 h-3.5" />
                Random Generator
              </button>
              <button
                type="button"
                onClick={() => onSetCallingMode('manual')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  state.callingMode === 'manual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Ball Machine Entry
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Voice Toggle */}
            <button
              type="button"
              onClick={() =>
                onUpdateAudio({ ...state.audio, voiceEnabled: !state.audio.voiceEnabled })
              }
              aria-pressed={state.audio.voiceEnabled}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                state.audio.voiceEnabled
                  ? 'border-blue-700 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {state.audio.voiceEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              Voice: {state.audio.voiceEnabled ? 'On' : 'Off'}
            </button>

            <button
              type="button"
              onClick={() => setAudioModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Audio Settings
            </button>

            {state.displayMode === 'multi' && (
              <>
                <button
                  type="button"
                  onClick={handleCopyPlayerUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copiedPlayerUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPlayerUrl ? 'Link Copied' : 'Copy Player Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSinglePreviewModal((s) => !s)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {showSinglePreviewModal ? 'Hide Player Preview' : 'Preview TV Screen'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Active Winner Banner Control Strip (if celebrating on Player Screen) */}
        {state.winnerBanner && (
          <div className="no-print rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-emerald-700 shrink-0" />
              <div className="text-sm text-emerald-950">
                <span className="font-bold">Winner Banner Active on Player Display:</span>{' '}
                {state.winnerBanner.patternName}
                {state.winnerBanner.serial ? ` · Card #${state.winnerBanner.serial}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onCelebrateWinner(null)}
                className="px-3.5 py-1.5 rounded-lg border border-emerald-400 bg-white text-xs font-semibold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
              >
                Clear Banner
              </button>
              {nextPlaylistIndex !== null && (
                <button
                  type="button"
                  onClick={onNextPlaylistGame}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Start Next Game
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live Embedded TV Preview when toggled in Multi-Display Mode */}
        {activeTab === 'board' && state.displayMode === 'multi' && showSinglePreviewModal && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Secondary Player Display Live Preview (Session {state.sessionId})
              </span>
              <button
                type="button"
                onClick={onTogglePlayerTheme}
                className="text-blue-700 font-semibold hover:underline cursor-pointer"
              >
                Switch TV Theme ({state.playerTheme === 'dark' ? 'Dark' : 'Light'})
              </button>
            </div>
            <PlayerDisplay state={state} embedded />
          </div>
        )}

        {/* TAB 1: CALLER BOARD (Adapts for Multi-Display vs Single-Display) */}
        {activeTab === 'board' && state.displayMode === 'single' && (
          <div className="space-y-5">
            {/* Single-Display Unified Room View: TV Board + Streamlined Caller Bar */}
            <PlayerDisplay state={state} onToggleTheme={onTogglePlayerTheme} embedded />

            {/* Compact Caller Control Bar underneath for Single-Screen operation */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-5 flex flex-wrap items-center gap-3">
                {state.callingMode === 'rng' ? (
                  <>
                    <button
                      type="button"
                      onClick={onDrawRandomBall}
                      disabled={remainingCount === 0}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-45 transition-colors cursor-pointer"
                    >
                      <Dices className="w-4 h-4" />
                      Draw Next Ball ({remainingCount} left)
                    </button>
                    <select
                      aria-label="Auto-draw interval"
                      value={state.autoDrawSeconds}
                      onChange={(e) => onSetAutoDraw(Number(e.target.value))}
                      className="h-11 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
                    >
                      <option value={0}>Manual Draw</option>
                      <option value={5}>Auto: 5s</option>
                      <option value={8}>Auto: 8s</option>
                      <option value={12}>Auto: 12s</option>
                    </select>
                  </>
                ) : (
                  <form onSubmit={handleManualSubmit} className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      ref={manualInputRef}
                      type="text"
                      inputMode="numeric"
                      value={manualNumberInput}
                      onChange={(e) => setManualNumberInput(e.target.value)}
                      placeholder="Ball # (1–75)"
                      className="w-36 h-11 px-3 rounded-xl border border-slate-300 font-mono-num text-sm font-bold"
                    />
                    <button
                      type="submit"
                      className="h-11 px-4 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 cursor-pointer"
                    >
                      Call Ball
                    </button>
                  </form>
                )}
              </div>

              <div className="lg:col-span-4 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <input
                    type="text"
                    value={quickSerial}
                    onChange={(e) => setQuickSerial(e.target.value)}
                    placeholder="Verify Serial #..."
                    className="w-full h-10 pl-3 pr-20 rounded-lg border border-slate-300 font-mono-num text-xs font-semibold"
                  />
                  {quickCheckResult && !quickCheckResult.notFound && (
                    <span
                      className={`absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold ${
                        quickCheckResult.evalRes.isBingo ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {quickCheckResult.evalRes.isBingo ? 'BINGO!' : 'Not yet'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPatternModalOpen(true)}
                  className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                >
                  Change Pattern
                </button>
              </div>

              <div className="lg:col-span-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onUndoLastBall}
                  disabled={state.calledNumbers.length === 0}
                  className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Undo
                </button>
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="h-10 px-3 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
                  >
                    Reset
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onResetBoard();
                      setConfirmReset(false);
                    }}
                    className="h-10 px-3 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                )}
                {nextPlaylistIndex !== null && (
                  <button
                    type="button"
                    onClick={onNextPlaylistGame}
                    className="h-10 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                  >
                    Next Round
                  </button>
                )}
              </div>
            </div>

            {state.callingMode === 'manual' && (
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Click any number on the quick caller board below to mark or unmark physical balls drawn from your ball machine:
                </p>
                <Flashboard
                  calledNumbers={state.calledNumbers}
                  interactive
                  onToggleNumber={onCallNumber}
                  compact
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'board' && state.displayMode === 'multi' && (
          <div className="space-y-6">
            {/* Top Row: Calling Controls & Active Round/Pattern */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left 7 cols: Current Ball & Calling Console */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col justify-between gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{state.callingMode === 'rng' ? 'Random Number Generator' : 'Ball Machine Manual Entry'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">{state.calledNumbers.length} Called</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">{remainingCount} Remaining</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-900 mt-0.5">
                      {state.currentRoundTitle}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onUndoLastBall}
                      disabled={state.calledNumbers.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Undo
                    </button>

                    {!confirmReset ? (
                      <button
                        type="button"
                        onClick={() => setConfirmReset(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Board
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onResetBoard();
                            setConfirmReset(false);
                          }}
                          className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
                        >
                          Confirm Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmReset(false)}
                          className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Center Focal Ball + Action */}
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-5 items-center py-2">
                  <div className="flex flex-col items-center justify-center">
                    {lastBall !== null ? (
                      (() => {
                        const letter = getLetterForNumber(lastBall);
                        const colors = getColumnColorClasses(letter);
                        return (
                          <div
                            className={`w-36 h-36 rounded-full ${colors.bg} text-white flex flex-col items-center justify-center shadow-md border-4 border-white ring-1 ring-slate-200`}
                          >
                            <span className="font-display font-extrabold text-2xl leading-none">
                              {letter}
                            </span>
                            <span className="font-mono-num font-extrabold text-5xl leading-none mt-1">
                              {lastBall}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="w-36 h-36 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                        <span className="text-xs font-semibold">No Ball Yet</span>
                        <span className="text-[11px]">Ready to Call</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {state.callingMode === 'rng' ? (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={onDrawRandomBall}
                          disabled={remainingCount === 0}
                          className="w-full h-14 rounded-xl bg-blue-700 text-white font-display font-bold text-lg hover:bg-blue-800 active:scale-[0.99] disabled:opacity-45 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
                        >
                          <Dices className="w-5 h-5" />
                          {remainingCount === 0 ? 'All 75 Balls Drawn' : 'Draw Next Ball'}
                        </button>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <span>Tip: Press Spacebar to draw next ball</span>
                          <div className="flex items-center gap-2">
                            <label htmlFor="auto-draw-select" className="font-medium text-slate-700">
                              Auto-Draw:
                            </label>
                            <select
                              id="auto-draw-select"
                              value={state.autoDrawSeconds}
                              onChange={(e) => onSetAutoDraw(Number(e.target.value))}
                              className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                            >
                              <option value={0}>Off (Manual)</option>
                              <option value={5}>Every 5s</option>
                              <option value={8}>Every 8s</option>
                              <option value={12}>Every 12s</option>
                              <option value={15}>Every 15s</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <form onSubmit={handleManualSubmit} className="flex gap-2">
                          <input
                            ref={manualInputRef}
                            type="text"
                            inputMode="numeric"
                            value={manualNumberInput}
                            onChange={(e) => {
                              setManualNumberInput(e.target.value);
                              if (manualInputError) setManualInputError(null);
                            }}
                            placeholder="Type ball # (1–75) + Enter"
                            className="flex-1 h-12 px-4 rounded-xl border border-slate-300 font-mono-num text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                          <button
                            type="submit"
                            className="h-12 px-5 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 transition-colors cursor-pointer shrink-0"
                          >
                            Call Ball
                          </button>
                        </form>
                        {manualInputError ? (
                          <p className="text-xs font-medium text-red-600">{manualInputError}</p>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Enter the ball number from your ball machine and press Enter, or click any number on the board below.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Recent Calls Strip */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-slate-500 mr-1">Previous:</span>
                      {recentBalls.length === 0 ? (
                        <span className="text-xs text-slate-400">None yet</span>
                      ) : (
                        recentBalls.map((num) => {
                          const letter = getLetterForNumber(num);
                          const colors = getColumnColorClasses(letter);
                          return (
                            <span
                              key={num}
                              className={`px-2.5 py-1 rounded-md text-xs font-mono-num font-bold text-white ${colors.bg}`}
                            >
                              {letter}-{num}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 cols: Qualifying Patterns + Playlist Advance + Quick Ticket Verify */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Qualifying Patterns & Round Box */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-slate-500">
                        Round {state.currentPlaylistIndex + 1} of {state.playlist.length}
                        {state.currentPrizeNote ? ` · Prize: ${state.currentPrizeNote}` : ''}
                      </div>
                      <h2 className="text-base font-bold text-slate-900 mt-0.5">
                        Qualifying Bingo Pattern{activePatterns.length > 1 ? 's' : ''}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPatternModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer shrink-0"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Select Pattern
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {activePatterns.map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <PatternMatrix
                          pattern={p}
                          allowRotations={state.allowRotations}
                          size="sm"
                        />
                        <div>
                          <div className="text-sm font-bold text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-500 max-w-[170px]">{p.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('playlist')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <ListMusic className="w-3.5 h-3.5" />
                      Edit Playlist ({state.playlist.length} games)
                    </button>

                    {nextPlaylistIndex !== null && (
                      <button
                        type="button"
                        onClick={onNextPlaylistGame}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        Next: {state.playlist[nextPlaylistIndex].title}
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Instant Ticket Verification Bar */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 flex-1 flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <TicketCheck className="w-4 h-4 text-blue-700" />
                      Quick Serial Check
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ticket')}
                      className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                    >
                      Full Checker / Manual Card →
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={quickSerial}
                      onChange={(e) => setQuickSerial(e.target.value)}
                      placeholder="Enter card serial # (e.g. 1–9000) to verify..."
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 font-mono-num text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {quickCheckResult && (
                    <div
                      className={`rounded-lg border px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs ${
                        quickCheckResult.notFound
                          ? 'border-slate-200 bg-slate-50 text-slate-600'
                          : quickCheckResult.evalRes.isBingo
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {quickCheckResult.notFound ? (
                        <span>No card found for "{quickSerial}". Try Full Checker for manual grids.</span>
                      ) : quickCheckResult.evalRes.isBingo ? (
                        <>
                          <div className="flex items-center gap-2 font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              {quickCheckResult.label}: VALID BINGO ({quickCheckResult.evalRes.matchedPatterns.map((m) => m.patternName).join(', ')})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onCelebrateWinner({
                                serial: quickSerial.trim(),
                                patternName: quickCheckResult.evalRes.matchedPatterns
                                  .map((m) => m.patternName)
                                  .join(' + '),
                                completedOnLastBall: quickCheckResult.evalRes.matchedPatterns.some(
                                  (m) => m.completedByLastBall
                                ),
                                timestamp: Date.now(),
                              })
                            }
                            className="px-2.5 py-1 rounded-md bg-emerald-700 text-white font-semibold hover:bg-emerald-800 shrink-0 cursor-pointer"
                          >
                            Announce
                          </button>
                        </>
                      ) : (
                        <span>
                          {quickCheckResult.label}: Not a bingo yet ({quickCheckResult.evalRes.closestMissingCount} away on {quickCheckResult.evalRes.closestPatternName})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive 75-Number Caller Flashboard */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  Digital Flashboard {state.callingMode === 'manual' ? '(Click any number to mark/unmark called)' : '(Click any number to manually adjust)'}
                </span>
                <span>
                  Click any called number again to undo it if needed.
                </span>
              </div>
              <Flashboard
                calledNumbers={state.calledNumbers}
                interactive
                onToggleNumber={onCallNumber}
              />
            </div>
          </div>
        )}

        {/* TAB 2: PLAYLIST */}
        {activeTab === 'playlist' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label htmlFor="event-title-input" className="text-xs font-semibold text-slate-700">
                  Event Name (shown on Player TV):
                </label>
                <input
                  id="event-title-input"
                  type="text"
                  value={state.eventTitle}
                  onChange={(e) => onUpdateEventTitle(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('board')}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Back to Caller Board
              </button>
            </div>
            <PlaylistPanel
              playlist={state.playlist}
              currentPlaylistIndex={state.currentPlaylistIndex}
              customPatterns={state.customPatterns}
              onUpdatePlaylist={onUpdatePlaylist}
              onLoadGame={(idx) => {
                onLoadPlaylistGame(idx);
                setActiveTab('board');
              }}
            />
          </div>
        )}

        {/* TAB 3: TICKET CHECK */}
        {activeTab === 'ticket' && (
          <TicketChecker
            calledNumbers={state.calledNumbers}
            activePatterns={activePatterns}
            allowRotations={state.allowRotations}
            savedCards={savedCards}
            customPerms={customPerms}
            onSaveFamilyCard={onSaveFamilyCard}
            onDeleteFamilyCard={onDeleteFamilyCard}
            onImportCustomPerms={onImportCustomPerms}
            onCelebrateWinner={(banner) => {
              onCelebrateWinner(banner);
              setActiveTab('board');
            }}
          />
        )}

        {/* TAB 4: PRINT CARDS */}
        {activeTab === 'print' && (
          <PrintCardsView eventTitle={state.eventTitle} />
        )}
      </main>

      {/* Modals */}
      <PatternSelectorModal
        isOpen={patternModalOpen}
        onClose={() => setPatternModalOpen(false)}
        activePatternIds={state.activePatternIds}
        allowRotations={state.allowRotations}
        customPatterns={state.customPatterns}
        onApply={(ids, rots) => {
          onApplyPatterns(ids, rots);
          playSoundCue('undo', state.audio);
        }}
        onSaveCustomPattern={onSaveCustomPattern}
        onDeleteCustomPattern={onDeleteCustomPattern}
      />

      <AudioSettingsModal
        isOpen={audioModalOpen}
        onClose={() => setAudioModalOpen(false)}
        audio={state.audio}
        onChange={onUpdateAudio}
      />
    </div>
  );
}
