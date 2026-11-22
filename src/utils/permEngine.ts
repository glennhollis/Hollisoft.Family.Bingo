import type { BingoCard, PermSeriesId } from '../types/bingo';

export interface PermSeriesInfo {
  id: PermSeriesId;
  name: string;
  maxSerial: number;
  description: string;
}

export const PERM_SERIES_LIST: PermSeriesInfo[] = [
  {
    id: 'standard-9000',
    name: 'Standard 9,000 Series (1–9,000)',
    maxSerial: 9000,
    description: 'Classic 9,000-face family pack series matching printed cards from this app.',
  },
  {
    id: 'charity-6000',
    name: 'Charity 6,000 Series (1–6,000)',
    maxSerial: 6000,
    description: 'Alternate 6,000-face deck permutation for secondary packs or tournaments.',
  },
  {
    id: 'custom-import',
    name: 'Imported Custom Perm Table',
    maxSerial: 36000,
    description: 'Cards imported from a commercial CSV/JSON perm table file.',
  },
];

// Deterministic SplitMix32 + Mulberry32 PRNG for reproducible perm cards
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seriesId: PermSeriesId, serial: number): number {
  const baseOffset = seriesId === 'standard-9000' ? 0x9e3779b9 : 0x85ebca6b;
  let x = (serial ^ baseOffset) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function pickUniqueFromRange(
  min: number,
  max: number,
  count: number,
  rng: () => number
): number[] {
  const pool: number[] = [];
  for (let n = min; n <= max; n++) {
    pool.push(n);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, count);
}

export function generatePermCard(
  serial: number,
  seriesId: PermSeriesId = 'standard-9000',
  customPermMap?: Record<number, (number | null)[][]>
): BingoCard | null {
  const cleanSerial = Math.floor(serial);
  if (!Number.isFinite(cleanSerial) || cleanSerial < 1) return null;

  if (seriesId === 'custom-import') {
    const found = customPermMap?.[cleanSerial];
    if (!found) return null;
    return {
      serial: cleanSerial,
      seriesId,
      seriesLabel: 'Custom Perm Table',
      grid: found,
    };
  }

  const maxSerial = seriesId === 'charity-6000' ? 6000 : 9000;
  if (cleanSerial > maxSerial) return null;

  const rng = mulberry32(hashSeed(seriesId, cleanSerial));
  const bCol = pickUniqueFromRange(1, 15, 5, rng);
  const iCol = pickUniqueFromRange(16, 30, 5, rng);
  const nCol = pickUniqueFromRange(31, 45, 4, rng);
  const gCol = pickUniqueFromRange(46, 60, 5, rng);
  const oCol = pickUniqueFromRange(61, 75, 5, rng);

  const grid: (number | null)[][] = Array.from({ length: 5 }, (_, row) => [
    bCol[row],
    iCol[row],
    row === 2 ? null : nCol[row < 2 ? row : row - 1],
    gCol[row],
    oCol[row],
  ]);

  return {
    serial: cleanSerial,
    seriesId,
    seriesLabel: seriesId === 'charity-6000' ? 'Charity 6000' : 'Standard 9000',
    grid,
  };
}

/**
 * Parses CSV or JSON perm data.
 * Supported CSV formats per line:
 *   serial,b1,b2,b3,b4,b5,i1,i2,i3,i4,i5,n1,n2,n4,n5,g1,g2,g3,g4,g5,o1,o2,o3,o4,o5 (25 cols, column-major)
 *   or 26 cols with FREE/0 in center.
 */
export function parseCustomPermImport(rawText: string): {
  cards: Record<number, (number | null)[][]>;
  count: number;
  error?: string;
} {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { cards: {}, count: 0, error: 'File or input is empty.' };
  }

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const cards: Record<number, (number | null)[][]> = {};
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item.serial === 'number' && Array.isArray(item.grid) && item.grid.length === 5) {
            cards[item.serial] = item.grid;
          }
        }
      } else if (typeof parsed === 'object' && parsed !== null) {
        for (const [k, v] of Object.entries(parsed)) {
          const serial = Number(k);
          if (Number.isFinite(serial) && Array.isArray(v) && v.length === 5) {
            cards[serial] = v as (number | null)[][];
          }
        }
      }
      const count = Object.keys(cards).length;
      if (count === 0) {
        return { cards: {}, count: 0, error: 'JSON parsed, but no valid 5x5 card entries were found.' };
      }
      return { cards, count };
    } catch {
      return { cards: {}, count: 0, error: 'Invalid JSON syntax.' };
    }
  }

  // Parse CSV lines
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const cards: Record<number, (number | null)[][]> = {};

  for (const line of lines) {
    const parts = line.split(/[,\t;]+/).map((p) => p.trim());
    if (parts.length < 25) continue;
    const serial = Number(parts[0]);
    if (!Number.isFinite(serial) || serial < 1) continue;

    const nums = parts.slice(1).map((v) => {
      if (v.toUpperCase() === 'FREE' || v === '0' || v === '*' || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    });

    if (nums.length === 24) {
      // 24 numbers without FREE slot -> insert null at N3 (index 12 in column-major)
      const grid: (number | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null));
      // B: 0..4, I: 5..9, N: 10..13, G: 14..18, O: 19..23
      for (let r = 0; r < 5; r++) {
        grid[r][0] = nums[r];
        grid[r][1] = nums[5 + r];
        grid[r][2] = r === 2 ? null : nums[10 + (r < 2 ? r : r - 1)];
        grid[r][3] = nums[14 + r];
        grid[r][4] = nums[19 + r];
      }
      cards[serial] = grid;
    } else if (nums.length >= 25) {
      // Row-major or Col-major detection: check if nums[0..4] are all <= 15 (col-major)
      const firstFive = nums.slice(0, 5).filter((x): x is number => x !== null);
      const isColMajor = firstFive.length > 0 && firstFive.every((n) => n >= 1 && n <= 15);
      const grid: (number | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null));
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid[r][c] = isColMajor ? nums[c * 5 + r] : nums[r * 5 + c];
        }
      }
      grid[2][2] = null;
      cards[serial] = grid;
    }
  }

  const count = Object.keys(cards).length;
  if (count === 0) {
    return {
      cards: {},
      count: 0,
      error: 'No valid CSV rows found. Expected: serial followed by 24 or 25 numbers per line.',
    };
  }
  return { cards, count };
}
