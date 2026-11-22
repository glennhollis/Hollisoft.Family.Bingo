import { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  Grid,
  Save,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  BingoPattern,
  PermSeriesId,
  SavedFamilyCard,
  WinnerBanner,
} from '../types/bingo';
import { BINGO_LETTERS, evaluateCardAgainstPatterns, getLetterForNumber } from '../data/patterns';
import {
  PERM_SERIES_LIST,
  generatePermCard,
  parseCustomPermImport,
} from '../utils/permEngine';

interface TicketCheckerProps {
  calledNumbers: number[];
  activePatterns: BingoPattern[];
  allowRotations: boolean;
  savedCards: SavedFamilyCard[];
  customPerms: Record<number, (number | null)[][]>;
  onSaveFamilyCard: (card: SavedFamilyCard) => void;
  onDeleteFamilyCard: (id: string) => void;
  onImportCustomPerms: (perms: Record<number, (number | null)[][]>) => void;
  onCelebrateWinner: (banner: WinnerBanner) => void;
  compact?: boolean;
}

function emptyManualGrid(): string[][] {
  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => (r === 2 && c === 2 ? 'FREE' : ''))
  );
}

export function TicketChecker({
  calledNumbers,
  activePatterns,
  allowRotations,
  savedCards,
  customPerms,
  onSaveFamilyCard,
  onDeleteFamilyCard,
  onImportCustomPerms,
  onCelebrateWinner,
  compact = false,
}: TicketCheckerProps) {
  const [mode, setMode] = useState<'serial' | 'manual' | 'import'>('serial');
  const [seriesId, setSeriesId] = useState<PermSeriesId>('standard-9000');
  const [serialInput, setSerialInput] = useState('1');

  // Manual entry grid for store-bought / shutter-slide cards
  const [manualGrid, setManualGrid] = useState<string[][]>(emptyManualGrid);
  const [manualLabel, setManualLabel] = useState('');
  const [manualSerial, setManualSerial] = useState('');

  // Custom perm import state
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const calledSet = useMemo(() => new Set(calledNumbers), [calledNumbers]);
  const lastBall = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null;

  // Resolve card from Serial Lookup (either saved family card matching code or Perm Engine)
  const cleanSerialTrim = serialInput.trim();
  const matchedSavedCard = useMemo(() => {
    if (!cleanSerialTrim) return null;
    return (
      savedCards.find(
        (c) => c.serialCode.toLowerCase() === cleanSerialTrim.toLowerCase()
      ) || null
    );
  }, [savedCards, cleanSerialTrim]);

  const numericSerial = Number(cleanSerialTrim.replace(/^#/, ''));
  const generatedPermCard = useMemo(() => {
    if (matchedSavedCard) return null;
    if (!Number.isFinite(numericSerial) || numericSerial < 1) return null;
    return generatePermCard(numericSerial, seriesId, customPerms);
  }, [matchedSavedCard, numericSerial, seriesId, customPerms]);

  const parsedManualGrid: (number | null)[][] = useMemo(() => {
    return manualGrid.map((row, r) =>
      row.map((val, c) => {
        if (r === 2 && c === 2) return null;
        const n = Number(val.trim());
        return Number.isFinite(n) && n >= 1 && n <= 75 ? n : -1;
      })
    );
  }, [manualGrid]);

  const activeGrid: (number | null)[][] | null =
    mode === 'serial'
      ? matchedSavedCard?.grid || generatedPermCard?.grid || null
      : mode === 'manual'
      ? parsedManualGrid
      : null;

  const evaluation = useMemo(() => {
    if (!activeGrid) return null;
    return evaluateCardAgainstPatterns(
      activeGrid,
      calledNumbers,
      activePatterns,
      allowRotations
    );
  }, [activeGrid, calledNumbers, activePatterns, allowRotations]);

  // Highlight cells belonging to matched patterns
  const winningCellMap = useMemo(() => {
    const map: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
    if (!evaluation) return map;
    for (const m of evaluation.matchedPatterns) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (m.matchedCells[r]?.[c]) map[r][c] = true;
        }
      }
    }
    return map;
  }, [evaluation]);

  const handleSaveManual = () => {
    const code = manualSerial.trim() || `CARD-${savedCards.length + 1}`;
    const label = manualLabel.trim() || `Family Card ${code}`;
    onSaveFamilyCard({
      id: `saved-${Date.now()}`,
      serialCode: code,
      label,
      grid: parsedManualGrid.map((row) => row.map((v) => (v === -1 ? null : v))),
      createdAt: Date.now(),
    });
    setSerialInput(code);
    setMode('serial');
  };

  const handleImportPermText = (raw: string) => {
    const res = parseCustomPermImport(raw);
    if (res.error) {
      setImportStatus(res.error);
      return;
    }
    onImportCustomPerms(res.cards);
    setSeriesId('custom-import');
    setImportStatus(`Loaded ${res.count} cards into Custom Perm Table.`);
    const firstKey = Object.keys(res.cards)[0];
    if (firstKey) setSerialInput(firstKey);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setImportText(content);
      handleImportPermText(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setMode('serial')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'serial' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Serial / Perm Lookup
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Manual Card Check
          </button>
          <button
            type="button"
            onClick={() => setMode('import')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'import' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Import Perm Table
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Checking against{' '}
          <span className="font-semibold text-slate-900">
            {activePatterns.map((p) => p.name).join(' + ')}
          </span>
          {allowRotations ? ' (Crazy Rotations On)' : ''}
        </div>
      </div>

      {mode === 'import' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Import Commercial / Custom Perm Database (CSV or JSON)
              </h3>
              <p className="text-xs text-slate-500">
                Have a CSV or JSON perm export for your physical paper deck? Load it here to verify cards by their printed serial number.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Choose CSV / JSON File
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </div>

          <textarea
            rows={5}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Example CSV line: 101, 2,5,9,12,15, 16,19,22,27,30, 31,35,40,44, 46,49,53,58,60, 62,65,69,71,75"
            className="w-full p-3 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Currently loaded in Custom Perm Table:{' '}
              <span className="font-mono-num font-bold text-slate-900">
                {Object.keys(customPerms).length}
              </span>{' '}
              cards
            </div>
            <button
              type="button"
              onClick={() => handleImportPermText(importText)}
              className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 cursor-pointer"
            >
              Parse & Load Perm Data
            </button>
          </div>

          {importStatus && (
            <div className="px-3 py-2 rounded-lg bg-slate-100 text-xs font-medium text-slate-800">
              {importStatus}
            </div>
          )}
        </div>
      )}

      {mode !== 'import' && (
        <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-12'} gap-6 items-start`}>
          {/* Left: Controls & Saved Cards */}
          <div className={`${compact ? '' : 'lg:col-span-5'} space-y-4`}>
            {mode === 'serial' ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div>
                  <label htmlFor="perm-series" className="block text-xs font-semibold text-slate-700 mb-1">
                    Card Series / Deck Format
                  </label>
                  <select
                    id="perm-series"
                    value={seriesId}
                    onChange={(e) => setSeriesId(e.target.value as PermSeriesId)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {PERM_SERIES_LIST.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.id === 'custom-import'
                          ? ` (${Object.keys(customPerms).length} loaded)`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="serial-lookup-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Card Serial / Perm Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="serial-lookup-input"
                      type="text"
                      value={serialInput}
                      onChange={(e) => setSerialInput(e.target.value)}
                      placeholder="Enter #1–9000 or saved card ID"
                      className="flex-1 h-11 px-3.5 rounded-lg border border-slate-300 font-mono-num text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const n = Number(serialInput);
                        if (Number.isFinite(n)) setSerialInput(String(Math.max(1, n + 1)));
                      }}
                      className="px-3 h-11 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      +1
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Type the Perm/Serial # printed on the player&apos;s card (e.g., 1–9000 from Print Cards, or a saved family card code).
                  </p>
                </div>

                {savedCards.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      Saved Family Cards ({savedCards.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {savedCards.map((sc) => (
                        <div
                          key={sc.id}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => setSerialInput(sc.serialCode)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100 cursor-pointer"
                          >
                            {sc.serialCode} · {sc.label}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteFamilyCard(sc.id)}
                            aria-label={`Remove ${sc.label}`}
                            className="px-1.5 py-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Manual Physical Card Entry
                  </h3>
                  <p className="text-xs text-slate-500">
                    For shutter-slide or store-bought paper cards without a digital perm table: enter the numbers on the card (or just the claimed winning row/column) to verify instantly.
                  </p>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {BINGO_LETTERS.map((l) => (
                    <div
                      key={l}
                      className="text-center font-display font-bold text-xs text-slate-600 py-1"
                    >
                      {l}
                    </div>
                  ))}
                  {manualGrid.map((row, r) =>
                    row.map((val, c) => {
                      const isFree = r === 2 && c === 2;
                      const num = Number(val);
                      const isHit = !isFree && Number.isFinite(num) && calledSet.has(num);
                      return (
                        <input
                          key={`${r}-${c}`}
                          type="text"
                          inputMode="numeric"
                          disabled={isFree}
                          value={isFree ? 'FREE' : val}
                          onChange={(e) => {
                            const nextVal = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                            setManualGrid((prev) =>
                              prev.map((rw, ri) =>
                                rw.map((cell, ci) => (ri === r && ci === c ? nextVal : cell))
                              )
                            );
                          }}
                          placeholder={`${BINGO_LETTERS[c]}`}
                          className={`h-10 text-center font-mono-num text-sm font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                            isFree
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : isHit
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setManualGrid(emptyManualGrid())}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Clear Numbers
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Save Physical Card for Future Rounds
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={manualSerial}
                      onChange={(e) => setManualSerial(e.target.value)}
                      placeholder="Card # (e.g. R-104)"
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={manualLabel}
                      onChange={(e) => setManualLabel(e.target.value)}
                      placeholder="Owner (e.g. Aunt Sue)"
                      className="h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveManual}
                    className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save to Family Card Registry
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Live Verification Output */}
          <div className={`${compact ? '' : 'lg:col-span-7'} rounded-xl border border-slate-200 bg-white p-5 space-y-4`}>
            {!activeGrid || !evaluation ? (
              <div className="py-12 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-sm font-semibold text-slate-800">
                  Card Not Found in Selected Series
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {seriesId === 'custom-import'
                    ? 'Import a CSV/JSON perm table first, or switch back to Standard 9,000 Series.'
                    : 'Enter a valid serial number between 1 and 9,000 (or 1–6,000 for Charity Series).'}
                </p>
              </div>
            ) : (
              <>
                {/* Verdict Banner */}
                <div
                  className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    evaluation.isBingo
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {evaluation.isBingo ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-base font-bold">
                        {evaluation.isBingo
                          ? `VERIFIED BINGO — ${evaluation.matchedPatterns.map((m) => m.patternName).join(' & ')}`
                          : 'No Qualifying Bingo Yet'}
                      </div>
                      <div className="text-xs mt-0.5 opacity-85">
                        {evaluation.isBingo ? (
                          evaluation.matchedPatterns.some((m) => m.completedByLastBall) ? (
                            <span>
                              Completed on the latest ball ({lastBall ? `${getLetterForNumber(lastBall)}-${lastBall}` : ''}).
                            </span>
                          ) : (
                            <span>Valid pattern completed earlier in this round.</span>
                          )
                        ) : (
                          <span>
                            Closest ({evaluation.closestPatternName}): needs{' '}
                            <span className="font-mono-num font-bold">
                              {evaluation.closestMissingCount}
                            </span>{' '}
                            more{' '}
                            {evaluation.closestMissingBalls.length > 0 &&
                              `(${evaluation.closestMissingBalls
                                .slice(0, 5)
                                .map((b) => `${b.letter}-${b.number}`)
                                .join(', ')})`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {evaluation.isBingo && (
                    <button
                      type="button"
                      onClick={() =>
                        onCelebrateWinner({
                          serial:
                            mode === 'serial'
                              ? cleanSerialTrim
                              : manualSerial.trim() || undefined,
                          cardLabel: matchedSavedCard?.label || manualLabel.trim() || undefined,
                          patternName: evaluation.matchedPatterns
                            .map((m) => m.patternName)
                            .join(' + '),
                          completedOnLastBall: evaluation.matchedPatterns.some(
                            (m) => m.completedByLastBall
                          ),
                          timestamp: Date.now(),
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shrink-0 cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      Announce Winner
                    </button>
                  )}
                </div>

                {/* Card Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div>
                    {mode === 'serial' ? (
                      <>
                        <span className="font-semibold text-slate-900">
                          {matchedSavedCard
                            ? matchedSavedCard.label
                            : `${generatedPermCard?.seriesLabel} · Serial #${generatedPermCard?.serial}`}
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold text-slate-900">Manual Card Preview</span>
                    )}
                  </div>
                  <div className="font-mono-num">
                    {evaluation.matchedCount} / 25 spaces covered
                  </div>
                </div>

                {/* 5x5 Visual Verification Card */}
                <div className="max-w-sm mx-auto">
                  <div className="grid grid-cols-5 gap-1.5 mb-1.5">
                    {BINGO_LETTERS.map((l) => (
                      <div
                        key={l}
                        className="h-9 rounded-lg bg-slate-900 text-white font-display font-extrabold text-base flex items-center justify-center"
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {activeGrid.map((row, r) =>
                      row.map((num, c) => {
                        const isFree = r === 2 && c === 2;
                        const isCalled = isFree || (typeof num === 'number' && calledSet.has(num));
                        const isWinningCell = winningCellMap[r][c];
                        const isLast = typeof num === 'number' && lastBall === num;

                        return (
                          <div
                            key={`${r}-${c}`}
                            className={`h-12 sm:h-14 rounded-lg border flex flex-col items-center justify-center font-mono-num transition-colors ${
                              isWinningCell
                                ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 font-extrabold'
                                : isLast
                                ? 'bg-amber-400 text-slate-950 border-amber-500 font-extrabold'
                                : isCalled
                                ? 'bg-blue-700 text-white border-blue-800 font-bold'
                                : 'bg-slate-50 text-slate-700 border-slate-200 font-semibold'
                            }`}
                          >
                            <span className={isFree ? 'text-[11px] font-display tracking-wide' : 'text-base'}>
                              {isFree ? 'FREE' : num === -1 || num === null ? '—' : num}
                            </span>
                            {isWinningCell && !isFree && (
                              <span className="text-[9px] uppercase tracking-wider opacity-90">
                                Win
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
