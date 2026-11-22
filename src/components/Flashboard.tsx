import { Check } from 'lucide-react';
import { BINGO_LETTERS, getColumnColorClasses, getLetterForNumber } from '../data/patterns';

interface FlashboardProps {
  calledNumbers: number[];
  interactive?: boolean;
  onToggleNumber?: (num: number) => void;
  theme?: 'light' | 'dark';
  compact?: boolean;
}

const COLUMN_RANGES: { letter: 'B' | 'I' | 'N' | 'G' | 'O'; start: number }[] = [
  { letter: 'B', start: 1 },
  { letter: 'I', start: 16 },
  { letter: 'N', start: 31 },
  { letter: 'G', start: 46 },
  { letter: 'O', start: 61 },
];

export function Flashboard({
  calledNumbers,
  interactive = false,
  onToggleNumber,
  theme = 'light',
  compact = false,
}: FlashboardProps) {
  const calledSet = new Set(calledNumbers);
  const lastCalled = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null;
  const isDark = theme === 'dark';

  return (
    <div
      className={`w-full rounded-xl border p-3 sm:p-4 ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      <div className="flex flex-col gap-2 sm:gap-2.5">
        {COLUMN_RANGES.map(({ letter, start }) => {
          const colors = getColumnColorClasses(letter);
          const numbers = Array.from({ length: 15 }, (_, idx) => start + idx);

          return (
            <div key={letter} className="grid grid-cols-[44px_1fr] sm:grid-cols-[54px_1fr] items-stretch gap-2">
              <div
                className={`${colors.bg} text-white rounded-lg flex items-center justify-center font-display font-extrabold ${
                  compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
                } select-none`}
              >
                {letter}
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-15 gap-1 sm:gap-1.5">
                {numbers.map((num) => {
                  const isCalled = calledSet.has(num);
                  const isLatest = lastCalled === num;
                  const colLetter = getLetterForNumber(num);
                  const colAccent = getColumnColorClasses(colLetter);

                  const cellClass = isLatest
                    ? isDark
                      ? 'bg-amber-400 text-slate-950 border-amber-200 ring-2 ring-amber-300 font-extrabold shadow-sm'
                      : 'bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-500 font-extrabold shadow-sm'
                    : isCalled
                    ? isDark
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                      : `${colAccent.bg} text-white border-transparent font-bold`
                    : isDark
                    ? 'bg-slate-800/75 text-slate-500 border-slate-800/90 font-medium'
                    : 'bg-slate-50 text-slate-400 border-slate-200 font-medium';

                  const sizeClass = compact
                    ? 'h-8 sm:h-9 text-xs sm:text-sm'
                    : 'h-10 sm:h-12 text-sm sm:text-lg';

                  if (interactive && onToggleNumber) {
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => onToggleNumber(num)}
                        aria-pressed={isCalled}
                        aria-label={`${BINGO_LETTERS[Math.floor((num - 1) / 15)]}-${num}${isCalled ? ' called' : ''}`}
                        className={`${sizeClass} ${cellClass} rounded-md border font-mono-num flex items-center justify-center relative transition-transform duration-150 hover:scale-[1.04] active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`}
                      >
                        <span>{num}</span>
                        {isCalled && !isLatest && (
                          <Check className="w-2.5 h-2.5 absolute top-0.5 right-0.5 opacity-80" aria-hidden="true" />
                        )}
                      </button>
                    );
                  }

                  return (
                    <div
                      key={num}
                      className={`${sizeClass} ${cellClass} rounded-md border font-mono-num flex items-center justify-center relative select-none transition-colors duration-200`}
                    >
                      <span>{num}</span>
                      {isLatest && (
                        <span className="sr-only">Latest called ball</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
