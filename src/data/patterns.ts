import type {
  BingoLetter,
  BingoPattern,
  CardEvaluationResult,
  MatchedPatternResult,
  PatternMask,
} from '../types/bingo';

function emptyMask(): PatternMask {
  return Array.from({ length: 5 }, () => Array(5).fill(false));
}

function maskFromCoords(coords: [number, number][]): PatternMask {
  const m = emptyMask();
  for (const [r, c] of coords) {
    if (r >= 0 && r < 5 && c >= 0 && c < 5) {
      m[r][c] = true;
    }
  }
  return m;
}

function maskFromStrings(rows: string[]): PatternMask {
  return rows.map((row) => row.split('').map((ch) => ch === 'X' || ch === '1'));
}

export function rotateMask90(mask: PatternMask): PatternMask {
  const next = emptyMask();
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      next[c][4 - r] = mask[r][c];
    }
  }
  return next;
}

export function getMaskVariations(mask: PatternMask, allowRotations: boolean): PatternMask[] {
  if (!allowRotations) return [mask];
  const seen = new Set<string>();
  const result: PatternMask[] = [];
  let cur = mask;
  for (let i = 0; i < 4; i++) {
    const key = cur.map((r) => r.map((v) => (v ? '1' : '0')).join('')).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cur);
    }
    cur = rotateMask90(cur);
  }
  return result;
}

// 12 standard lines (5 rows, 5 cols, 2 diagonals)
const HORIZONTAL_MASKS: PatternMask[] = [0, 1, 2, 3, 4].map((r) =>
  maskFromCoords([0, 1, 2, 3, 4].map((c) => [r, c]))
);

const VERTICAL_MASKS: PatternMask[] = [0, 1, 2, 3, 4].map((c) =>
  maskFromCoords([0, 1, 2, 3, 4].map((r) => [r, c]))
);

const DIAGONAL_MASKS: PatternMask[] = [
  maskFromCoords([[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]),
  maskFromCoords([[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]]),
];

const ALL_LINE_MASKS: PatternMask[] = [...HORIZONTAL_MASKS, ...VERTICAL_MASKS, ...DIAGONAL_MASKS];

const POSTAGE_STAMP_MASKS: PatternMask[] = [
  maskFromCoords([[0, 0], [0, 1], [1, 0], [1, 1]]),
  maskFromCoords([[0, 3], [0, 4], [1, 3], [1, 4]]),
  maskFromCoords([[3, 0], [3, 1], [4, 0], [4, 1]]),
  maskFromCoords([[3, 3], [3, 4], [4, 3], [4, 4]]),
];

const SIX_PACK_MASKS: PatternMask[] = (() => {
  const list: PatternMask[] = [];
  // 2 rows x 3 cols
  for (let r = 0; r <= 3; r++) {
    for (let c = 0; c <= 2; c++) {
      const coords: [number, number][] = [];
      for (let dr = 0; dr < 2; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          coords.push([r + dr, c + dc]);
        }
      }
      list.push(maskFromCoords(coords));
    }
  }
  // 3 rows x 2 cols
  for (let r = 0; r <= 2; r++) {
    for (let c = 0; c <= 3; c++) {
      const coords: [number, number][] = [];
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 2; dc++) {
          coords.push([r + dr, c + dc]);
        }
      }
      list.push(maskFromCoords(coords));
    }
  }
  return list;
})();

export const PRESET_PATTERNS: BingoPattern[] = [
  {
    id: 'regular-line',
    name: 'Regular Bingo (Any Line)',
    category: 'classic',
    description: 'Any 5 in a row: horizontal, vertical, or diagonal.',
    masks: ALL_LINE_MASKS,
  },
  {
    id: 'four-corners',
    name: 'Four Corners',
    category: 'classic',
    description: 'All four outer corner spaces on the card.',
    masks: [maskFromCoords([[0, 0], [0, 4], [4, 0], [4, 4]])],
  },
  {
    id: 'double-bingo',
    name: 'Double Bingo (2 Lines)',
    category: 'classic',
    description: 'Any two complete lines (rows, columns, or diagonals).',
    masks: ALL_LINE_MASKS,
    requiresTwoMasks: true,
  },
  {
    id: 'horizontal-only',
    name: 'Horizontal Line',
    category: 'classic',
    description: 'Any complete 5-number row across.',
    masks: HORIZONTAL_MASKS,
  },
  {
    id: 'vertical-only',
    name: 'Vertical Line',
    category: 'classic',
    description: 'Any complete 5-number column down.',
    masks: VERTICAL_MASKS,
  },
  {
    id: 'diagonal-only',
    name: 'Diagonal Line',
    category: 'classic',
    description: 'Either corner-to-corner diagonal through FREE.',
    masks: DIAGONAL_MASKS,
  },
  {
    id: 'postage-stamp',
    name: 'Postage Stamp',
    category: 'classic',
    description: 'A 2x2 block in any of the four corners.',
    masks: POSTAGE_STAMP_MASKS,
  },
  {
    id: 'blackout',
    name: 'Blackout (Coverall)',
    category: 'specialty',
    description: 'Every single number on the entire 5x5 card.',
    masks: [maskFromStrings(['XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX'])],
  },
  {
    id: 'picture-frame',
    name: 'Picture Frame',
    category: 'specialty',
    description: 'All 16 squares around the outer border.',
    masks: [maskFromStrings(['XXXXX', 'X...X', 'X...X', 'X...X', 'XXXXX'])],
  },
  {
    id: 'inner-frame',
    name: 'Inner Frame',
    category: 'specialty',
    description: 'The 8 squares directly surrounding the FREE space.',
    masks: [maskFromStrings(['.....', '.XXX.', '.X.X.', '.XXX.', '.....'])],
  },
  {
    id: 'small-diamond',
    name: 'Small Diamond',
    category: 'shapes',
    description: 'Four squares orthogonally adjacent to FREE.',
    masks: [maskFromStrings(['.....', '..X..', '.X.X.', '..X..', '.....'])],
  },
  {
    id: 'large-diamond',
    name: 'Large Diamond',
    category: 'shapes',
    description: 'Eight-point diamond reaching the center of all 4 edges.',
    masks: [maskFromStrings(['..X..', '.X.X.', 'X...X', '.X.X.', '..X..'])],
  },
  {
    id: 'letter-x',
    name: 'Letter X',
    category: 'shapes',
    description: 'Both diagonals intersecting at the FREE space.',
    masks: [maskFromStrings(['X...X', '.X.X.', '..X..', '.X.X.', 'X...X'])],
  },
  {
    id: 'plus-sign',
    name: 'Plus Sign (+)',
    category: 'shapes',
    description: 'Middle row (row 3) and middle column (N).',
    masks: [maskFromStrings(['..X..', '..X..', 'XXXXX', '..X..', '..X..'])],
  },
  {
    id: 'letter-t',
    name: 'Letter T',
    category: 'shapes',
    description: 'Top row and center column. Rotatable for Crazy T.',
    masks: [maskFromStrings(['XXXXX', '..X..', '..X..', '..X..', '..X..'])],
    rotatable: true,
  },
  {
    id: 'letter-l',
    name: 'Letter L',
    category: 'shapes',
    description: 'Left column and bottom row. Rotatable for Crazy L.',
    masks: [maskFromStrings(['X....', 'X....', 'X....', 'X....', 'XXXXX'])],
    rotatable: true,
  },
  {
    id: 'letter-h',
    name: 'Letter H',
    category: 'shapes',
    description: 'B and O columns plus middle row.',
    masks: [maskFromStrings(['X...X', 'X...X', 'XXXXX', 'X...X', 'X...X'])],
    rotatable: true,
  },
  {
    id: 'letter-z',
    name: 'Letter Z',
    category: 'shapes',
    description: 'Top row, bottom row, and connecting diagonal.',
    masks: [maskFromStrings(['XXXXX', '...X.', '..X..', '.X...', 'XXXXX'])],
    rotatable: true,
  },
  {
    id: 'kite',
    name: 'Kite',
    category: 'specialty',
    description: 'A 2x2 corner block with a diagonal tail. Rotatable for Crazy Kite.',
    masks: [maskFromStrings(['XX...', 'XX...', '..X..', '...X.', '....X'])],
    rotatable: true,
  },
  {
    id: 'railroad-tracks',
    name: 'Railroad Tracks',
    category: 'specialty',
    description: 'Columns I and G (or rows 2 and 4 when rotated).',
    masks: [maskFromStrings(['.X.X.', '.X.X.', '.X.X.', '.X.X.', '.X.X.'])],
    rotatable: true,
  },
  {
    id: 'bowtie',
    name: 'Bowtie',
    category: 'specialty',
    description: 'Outer columns B and O connected by both diagonals.',
    masks: [maskFromStrings(['X...X', 'XX.XX', 'X.X.X', 'XX.XX', 'X...X'])],
    rotatable: true,
  },
  {
    id: 'pyramid',
    name: 'Pyramid',
    category: 'shapes',
    description: 'Centered triangle peaking at the top row.',
    masks: [maskFromStrings(['..X..', '.XXX.', 'XXXXX', '.....', '.....'])],
    rotatable: true,
  },
  {
    id: 'six-pack',
    name: 'Six Pack (2x3)',
    category: 'specialty',
    description: 'Any contiguous 2x3 or 3x2 rectangle of 6 spaces.',
    masks: SIX_PACK_MASKS,
  },
];

export const BINGO_LETTERS: BingoLetter[] = ['B', 'I', 'N', 'G', 'O'];

export function getLetterForNumber(num: number): BingoLetter {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
}

export function formatBallLabel(num: number): string {
  return `${getLetterForNumber(num)}-${num}`;
}

export function getColumnColorClasses(letter: BingoLetter) {
  switch (letter) {
    case 'B':
      return {
        bg: 'bg-blue-700',
        bgSoft: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        ring: 'ring-blue-600',
      };
    case 'I':
      return {
        bg: 'bg-red-600',
        bgSoft: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        ring: 'ring-red-600',
      };
    case 'N':
      return {
        bg: 'bg-amber-600',
        bgSoft: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        ring: 'ring-amber-600',
      };
    case 'G':
      return {
        bg: 'bg-emerald-600',
        bgSoft: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        ring: 'ring-emerald-600',
      };
    case 'O':
      return {
        bg: 'bg-orange-600',
        bgSoft: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200',
        ring: 'ring-orange-600',
      };
  }
}

export function getEffectiveMasks(pattern: BingoPattern, allowRotations: boolean): PatternMask[] {
  if (!allowRotations || !pattern.rotatable) {
    return pattern.masks;
  }
  const all: PatternMask[] = [];
  const seen = new Set<string>();
  for (const base of pattern.masks) {
    for (const variant of getMaskVariations(base, true)) {
      const key = variant.map((r) => r.map((v) => (v ? '1' : '0')).join('')).join('|');
      if (!seen.has(key)) {
        seen.add(key);
        all.push(variant);
      }
    }
  }
  return all;
}

export function evaluateCardAgainstPatterns(
  grid: (number | null)[][],
  calledNumbers: number[],
  patterns: BingoPattern[],
  allowRotations: boolean
): CardEvaluationResult {
  const calledSet = new Set(calledNumbers);
  const lastBall = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null;
  const calledWithoutLast = lastBall !== null ? new Set(calledNumbers.slice(0, -1)) : calledSet;

  // Determine matched count on card
  let matchedCount = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const val = grid[r]?.[c];
      if (val === null || (typeof val === 'number' && calledSet.has(val))) {
        matchedCount++;
      }
    }
  }

  const isCellHit = (r: number, c: number, set: Set<number>): boolean => {
    const val = grid[r]?.[c];
    if (val === null) return true; // FREE space
    return typeof val === 'number' && set.has(val);
  };

  const matchedPatterns: MatchedPatternResult[] = [];
  let closestPatternName = patterns[0]?.name || 'Regular Bingo';
  let closestMissingCount = 99;
  let closestMissingBalls: { letter: BingoLetter; number: number }[] = [];

  for (const pattern of patterns) {
    const effectiveMasks = getEffectiveMasks(pattern, allowRotations);

    if (pattern.requiresTwoMasks) {
      // Double Bingo: need at least 2 distinct masks satisfied simultaneously
      const completedMasks: { mask: PatternMask; hitLast: boolean }[] = [];
      const missingPerMask: {
        missing: { letter: BingoLetter; number: number }[];
      }[] = [];

      for (const mask of effectiveMasks) {
        const missing: { letter: BingoLetter; number: number }[] = [];
        let allHitWithCurrent = true;
        let allHitBeforeLast = true;
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            if (!mask[r][c]) continue;
            if (!isCellHit(r, c, calledSet)) {
              allHitWithCurrent = false;
              const num = grid[r]?.[c];
              if (typeof num === 'number') {
                missing.push({ letter: getLetterForNumber(num), number: num });
              }
            }
            if (!isCellHit(r, c, calledWithoutLast)) {
              allHitBeforeLast = false;
            }
          }
        }
        if (allHitWithCurrent) {
          completedMasks.push({ mask, hitLast: !allHitBeforeLast });
        } else {
          missingPerMask.push({ missing });
        }
      }

      if (completedMasks.length >= 2) {
        const combined = emptyMask();
        for (const item of completedMasks.slice(0, 2)) {
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
              if (item.mask[r][c]) combined[r][c] = true;
            }
          }
        }
        matchedPatterns.push({
          patternId: pattern.id,
          patternName: pattern.name,
          matchedCells: combined,
          completedByLastBall:
            completedMasks.length === 2
              ? completedMasks.some((m) => m.hitLast)
              : completedMasks.every((m) => m.hitLast) || completedMasks.filter((m) => !m.hitLast).length < 2,
        });
      } else {
        missingPerMask.sort((a, b) => a.missing.length - b.missing.length);
        const neededLines = 2 - completedMasks.length;
        const bestMissing = missingPerMask.slice(0, neededLines).flatMap((x) => x.missing);
        // Deduplicate missing numbers
        const uniqueMap = new Map<number, { letter: BingoLetter; number: number }>();
        for (const b of bestMissing) uniqueMap.set(b.number, b);
        const uniqueMissing = Array.from(uniqueMap.values());
        if (uniqueMissing.length < closestMissingCount) {
          closestMissingCount = uniqueMissing.length;
          closestMissingBalls = uniqueMissing;
          closestPatternName = pattern.name;
        }
      }
      continue;
    }

    // Standard single/multi-option mask evaluation
    let matchedThisPattern = false;
    for (const mask of effectiveMasks) {
      const missing: { letter: BingoLetter; number: number }[] = [];
      let allHitWithCurrent = true;
      let allHitBeforeLast = true;

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (!mask[r][c]) continue;
          if (!isCellHit(r, c, calledSet)) {
            allHitWithCurrent = false;
            const num = grid[r]?.[c];
            if (typeof num === 'number') {
              missing.push({ letter: getLetterForNumber(num), number: num });
            }
          }
          if (!isCellHit(r, c, calledWithoutLast)) {
            allHitBeforeLast = false;
          }
        }
      }

      if (allHitWithCurrent && !matchedThisPattern) {
        matchedThisPattern = true;
        matchedPatterns.push({
          patternId: pattern.id,
          patternName: pattern.name,
          matchedCells: mask,
          completedByLastBall: lastBall !== null && !allHitBeforeLast,
        });
      } else if (!allHitWithCurrent && missing.length < closestMissingCount) {
        closestMissingCount = missing.length;
        closestMissingBalls = missing;
        closestPatternName = pattern.name;
      }
    }
  }

  return {
    isBingo: matchedPatterns.length > 0,
    matchedPatterns,
    matchedCount,
    closestPatternName,
    closestMissingCount: matchedPatterns.length > 0 ? 0 : closestMissingCount,
    closestMissingBalls: matchedPatterns.length > 0 ? [] : closestMissingBalls,
  };
}
