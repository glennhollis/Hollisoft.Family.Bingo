export type BingoLetter = 'B' | 'I' | 'N' | 'G' | 'O';

export type CallingMode = 'rng' | 'manual';

export type DisplayMode = 'multi' | 'single';

export type PatternCategory = 'classic' | 'specialty' | 'shapes' | 'custom';

export type PatternMask = boolean[][]; // 5x5 [row][col]

export interface BingoPattern {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  masks: PatternMask[]; // Any mask in the array qualifies (e.g. 12 lines for Regular Bingo)
  rotatable?: boolean;  // Whether "Allow Rotations (Crazy)" generates 90/180/270 variants
  requiresTwoMasks?: boolean; // Special case for Double Bingo (any 2 distinct lines)
  isCustom?: boolean;
}

export interface PlaylistGame {
  id: string;
  title: string;
  patternIds: string[];
  allowRotations: boolean;
  preferredMode: CallingMode;
  prizeNote: string;
  status: 'upcoming' | 'active' | 'completed';
}

export type PermSeriesId = 'standard-9000' | 'charity-6000' | 'custom-import';

export interface BingoCard {
  serial: number;
  seriesId: PermSeriesId;
  seriesLabel: string;
  grid: (number | null)[][]; // 5x5 [row][col], [2][2] is null (FREE)
}

export interface SavedFamilyCard {
  id: string;
  serialCode: string;
  label: string;
  grid: (number | null)[][];
  createdAt: number;
}

export interface AudioSettings {
  soundCuesEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  voiceEnabled: boolean;
  voiceURI: string;    // Empty string = system default
  voiceRate: number;   // 0.6 to 1.5
  voicePitch: number;  // 0.8 to 1.2
  phraseStyle: 'classic' | 'concise' | 'double';
  announceEvents: boolean; // Announce new game / winner aloud
}

export interface WinnerBanner {
  serial?: string;
  cardLabel?: string;
  patternName: string;
  completedOnLastBall: boolean;
  timestamp: number;
}

export interface GameSessionState {
  sessionId: string;
  eventTitle: string;
  calledNumbers: number[]; // Ordered chronologically: first called -> last called
  activePatternIds: string[];
  allowRotations: boolean;
  callingMode: CallingMode;
  displayMode: DisplayMode;
  currentRoundTitle: string;
  currentPrizeNote: string;
  currentPlaylistIndex: number;
  playlist: PlaylistGame[];
  customPatterns: BingoPattern[];
  winnerBanner: WinnerBanner | null;
  playerTheme: 'dark' | 'light';
  autoDrawSeconds: number; // 0 = manual draw
  audio: AudioSettings;
  updatedAt: number;
}

export interface MatchedPatternResult {
  patternId: string;
  patternName: string;
  matchedCells: boolean[][];
  completedByLastBall: boolean;
}

export interface CardEvaluationResult {
  isBingo: boolean;
  matchedPatterns: MatchedPatternResult[];
  matchedCount: number;
  closestPatternName: string;
  closestMissingCount: number;
  closestMissingBalls: { letter: BingoLetter; number: number }[];
}
