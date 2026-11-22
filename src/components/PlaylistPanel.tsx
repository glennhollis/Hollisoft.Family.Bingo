import { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import type { BingoPattern, CallingMode, PlaylistGame } from '../types/bingo';
import { PRESET_PATTERNS } from '../data/patterns';
import { DEFAULT_PLAYLIST } from '../data/defaults';
import { PatternMatrix } from './PatternMatrix';

interface PlaylistPanelProps {
  playlist: PlaylistGame[];
  currentPlaylistIndex: number;
  customPatterns: BingoPattern[];
  onUpdatePlaylist: (next: PlaylistGame[]) => void;
  onLoadGame: (index: number) => void;
}

export function PlaylistPanel({
  playlist,
  currentPlaylistIndex,
  customPatterns,
  onUpdatePlaylist,
  onLoadGame,
}: PlaylistPanelProps) {
  const allPatterns = [...PRESET_PATTERNS, ...customPatterns];
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newPatternIds, setNewPatternIds] = useState<string[]>(['regular-line']);
  const [newRotations, setNewRotations] = useState(false);
  const [newMode, setNewMode] = useState<CallingMode>('rng');
  const [newPrize, setNewPrize] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const handleAddGame = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim() || `Game ${playlist.length + 1}`;
    const game: PlaylistGame = {
      id: `round-${Date.now()}`,
      title,
      patternIds: newPatternIds.length > 0 ? newPatternIds : ['regular-line'],
      allowRotations: newRotations,
      preferredMode: newMode,
      prizeNote: newPrize.trim(),
      status: 'upcoming',
    };
    onUpdatePlaylist([...playlist, game]);
    setNewTitle('');
    setNewPrize('');
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= playlist.length) return;
    const copy = [...playlist];
    const [removed] = copy.splice(idx, 1);
    copy.splice(target, 0, removed);
    onUpdatePlaylist(copy);
  };

  const duplicateItem = (idx: number) => {
    const src = playlist[idx];
    const copy = [...playlist];
    copy.splice(idx + 1, 0, {
      ...src,
      id: `round-${Date.now()}`,
      title: `${src.title} (Copy)`,
      status: 'upcoming',
    });
    onUpdatePlaylist(copy);
  };

  const deleteItem = (idx: number) => {
    if (playlist.length <= 1) return;
    const copy = playlist.filter((_, i) => i !== idx);
    onUpdatePlaylist(copy);
  };

  const toggleNewPattern = (id: string) => {
    setNewPatternIds((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((p) => p !== id)
          : prev
        : [...prev, id]
    );
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(playlist, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-bingo-playlist.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed) || parsed.length === 0) {
          setImportFeedback('Invalid playlist file: expected a list of games.');
          return;
        }
        const sanitized: PlaylistGame[] = parsed.map((g, i) => ({
          id: typeof g.id === 'string' ? g.id : `imported-${Date.now()}-${i}`,
          title: typeof g.title === 'string' ? g.title : `Game ${i + 1}`,
          patternIds: Array.isArray(g.patternIds) && g.patternIds.length > 0 ? g.patternIds : ['regular-line'],
          allowRotations: Boolean(g.allowRotations),
          preferredMode: g.preferredMode === 'manual' ? 'manual' : 'rng',
          prizeNote: typeof g.prizeNote === 'string' ? g.prizeNote : '',
          status: i === 0 ? 'active' : 'upcoming',
        }));
        onUpdatePlaylist(sanitized);
        setImportFeedback(`Imported ${sanitized.length} games.`);
      } catch {
        setImportFeedback('Could not read JSON playlist file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Queue Column */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Event Game Playlist</h2>
            <p className="text-xs text-slate-500">
              Queue your rounds ahead of time. Loading a round resets the board and updates the Player Display.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => onUpdatePlaylist(DEFAULT_PLAYLIST)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Sample Pack
            </button>
          </div>
        </div>

        {importFeedback && (
          <div className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-900">
            {importFeedback}
          </div>
        )}

        <div className="space-y-3">
          {playlist.map((game, index) => {
            const isActive = index === currentPlaylistIndex;
            const patterns = game.patternIds
              .map((id) => allPatterns.find((p) => p.id === id))
              .filter((p): p is BingoPattern => Boolean(p));

            return (
              <div
                key={game.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isActive
                    ? 'border-blue-700 bg-blue-50/40 ring-1 ring-blue-700'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="shrink-0 pt-0.5">
                      {patterns[0] && (
                        <PatternMatrix
                          pattern={patterns[0]}
                          allowRotations={game.allowRotations}
                          size="xs"
                          showHeader={false}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono-num font-semibold">Round {index + 1}</span>
                        <span aria-hidden="true">·</span>
                        <span>{game.preferredMode === 'rng' ? 'RNG Auto/Draw' : 'Ball Machine'}</span>
                        {game.allowRotations && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Crazy Rotations</span>
                          </>
                        )}
                        {isActive && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-blue-700">Current Round</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                        {game.title}
                      </h3>
                      <div className="text-xs text-slate-600 mt-1">
                        Qualifies: {patterns.map((p) => p.name).join(' OR ')}
                        {game.prizeNote ? ` · Prize: ${game.prizeNote}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${game.title} up`}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === playlist.length - 1}
                      aria-label={`Move ${game.title} down`}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateItem(index)}
                      aria-label={`Duplicate ${game.title}`}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(index)}
                      disabled={playlist.length <= 1}
                      aria-label={`Delete ${game.title}`}
                      className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onLoadGame(index)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'bg-blue-700 text-white hover:bg-blue-800'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isActive ? 'Restart' : 'Start Round'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Round Form */}
      <form
        onSubmit={handleAddGame}
        className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4"
      >
        <div>
          <h3 className="text-base font-bold text-slate-900">Add Game to Playlist</h3>
          <p className="text-xs text-slate-500">
            Configure the round name, qualifying pattern(s), and calling method.
          </p>
        </div>

        <div>
          <label htmlFor="pl-title" className="block text-xs font-semibold text-slate-700 mb-1">
            Round Title
          </label>
          <input
            id="pl-title"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={`Game ${playlist.length + 1}: Special Pattern`}
            className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label htmlFor="pl-prize" className="block text-xs font-semibold text-slate-700 mb-1">
            Prize / Round Note (Optional)
          </label>
          <input
            id="pl-prize"
            type="text"
            value={newPrize}
            onChange={(e) => setNewPrize(e.target.value)}
            placeholder="e.g., $10 Gift Card or Trophy"
            className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1">Calling Mode</span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100">
              <button
                type="button"
                onClick={() => setNewMode('rng')}
                className={`py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  newMode === 'rng' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                RNG Draw
              </button>
              <button
                type="button"
                onClick={() => setNewMode('manual')}
                className={`py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  newMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Ball Machine
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newRotations}
                onChange={(e) => setNewRotations(e.target.checked)}
                className="rounded border-slate-300 accent-blue-700"
              />
              Allow Crazy Rotations
            </label>
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">
            Qualifying Patterns ({newPatternIds.length} selected)
          </span>
          <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {allPatterns.map((p) => {
              const checked = newPatternIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 ${
                    checked ? 'bg-blue-50/50 font-semibold text-blue-900' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleNewPattern(p.id)}
                      className="rounded border-slate-300 accent-blue-700"
                    />
                    <span>{p.name}</span>
                  </div>
                  <PatternMatrix pattern={p} allowRotations={newRotations} size="xs" showHeader={false} />
                </label>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Round to Playlist
        </button>
      </form>
    </div>
  );
}
