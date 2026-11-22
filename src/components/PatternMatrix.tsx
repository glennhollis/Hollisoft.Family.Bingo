import { useEffect, useState } from 'react';
import type { BingoPattern, PatternMask } from '../types/bingo';
import { getEffectiveMasks } from '../data/patterns';

interface PatternMatrixProps {
  pattern?: BingoPattern;
  mask?: PatternMask;
  allowRotations?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
  interactive?: boolean;
  onToggleCell?: (row: number, col: number) => void;
  showHeader?: boolean;
}

const LETTERS = ['B', 'I', 'N', 'G', 'O'];

export function PatternMatrix({
  pattern,
  mask,
  allowRotations = false,
  size = 'md',
  theme = 'light',
  interactive = false,
  onToggleCell,
  showHeader = true,
}: PatternMatrixProps) {
  const effectiveMasks = pattern
    ? getEffectiveMasks(pattern, allowRotations)
    : mask
    ? [mask]
    : [];

  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
    if (effectiveMasks.length <= 1 || interactive) return;
    const interval = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % effectiveMasks.length);
    }, 1100);
    return () => window.clearInterval(interval);
  }, [pattern?.id, allowRotations, effectiveMasks.length, interactive]);

  const activeMask = effectiveMasks[frameIndex % Math.max(1, effectiveMasks.length)] || [
    [false, false, false, false, false],
    [false, false, false, false, false],
    [false, false, true, false, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
  ];

  const cellClasses =
    size === 'xs'
      ? 'w-3.5 h-3.5 text-[7px] rounded-[2px]'
      : size === 'sm'
      ? 'w-5 h-5 text-[9px] rounded-[3px]'
      : size === 'lg'
      ? 'w-10 h-10 text-xs rounded-md'
      : 'w-7 h-7 text-[10px] rounded';

  const gapClass = size === 'xs' ? 'gap-0.5' : size === 'sm' ? 'gap-1' : 'gap-1.5';

  const isDark = theme === 'dark';

  return (
    <div className="inline-flex flex-col items-center select-none">
      {showHeader && (
        <div className={`grid grid-cols-5 ${gapClass} mb-1`}>
          {LETTERS.map((l) => (
            <div
              key={l}
              className={`${cellClasses} flex items-center justify-center font-display font-bold ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {l}
            </div>
          ))}
        </div>
      )}
      <div className={`grid grid-cols-5 ${gapClass}`}>
        {activeMask.map((row, r) =>
          row.map((active, c) => {
            const isFree = r === 2 && c === 2;
            const baseBg = active
              ? isDark
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-blue-700 text-white border-blue-800'
              : isDark
              ? 'bg-slate-800/90 text-slate-500 border-slate-700'
              : 'bg-slate-100 text-slate-400 border-slate-200';

            if (interactive && onToggleCell) {
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => onToggleCell(r, c)}
                  aria-label={`Row ${r + 1} Column ${LETTERS[c]}${isFree ? ' Free' : ''}`}
                  className={`${cellClasses} border flex items-center justify-center font-semibold transition-colors duration-150 cursor-pointer hover:ring-2 hover:ring-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${baseBg}`}
                >
                  {isFree ? '★' : active ? '●' : ''}
                </button>
              );
            }

            return (
              <div
                key={`${r}-${c}`}
                className={`${cellClasses} border flex items-center justify-center font-semibold transition-colors duration-200 ${baseBg}`}
              >
                {isFree ? '★' : ''}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
