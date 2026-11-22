import type { AudioSettings, GameSessionState, PlaylistGame } from '../types/bingo';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  soundCuesEnabled: true,
  soundVolume: 0.75,
  voiceEnabled: false,
  voiceURI: '',
  voiceRate: 1.0,
  voicePitch: 1.0,
  phraseStyle: 'classic',
  announceEvents: true,
};

export const DEFAULT_PLAYLIST: PlaylistGame[] = [
  {
    id: 'round-1',
    title: 'Game 1: Warm-Up Regular Bingo',
    patternIds: ['regular-line'],
    allowRotations: false,
    preferredMode: 'rng',
    prizeNote: 'First Pick at Dessert Table',
    status: 'active',
  },
  {
    id: 'round-2',
    title: 'Game 2: Four Corners Sprint',
    patternIds: ['four-corners'],
    allowRotations: false,
    preferredMode: 'rng',
    prizeNote: 'Family Bragging Rights',
    status: 'upcoming',
  },
  {
    id: 'round-3',
    title: 'Game 3: Line or Four Corners',
    patternIds: ['regular-line', 'four-corners'],
    allowRotations: false,
    preferredMode: 'rng',
    prizeNote: 'Gift Card Prize',
    status: 'upcoming',
  },
  {
    id: 'round-4',
    title: 'Game 4: Crazy Kite',
    patternIds: ['kite'],
    allowRotations: true,
    preferredMode: 'rng',
    prizeNote: 'Mystery Prize Bag',
    status: 'upcoming',
  },
  {
    id: 'round-5',
    title: 'Game 5: Letter X Challenge',
    patternIds: ['letter-x'],
    allowRotations: false,
    preferredMode: 'rng',
    prizeNote: 'Runner-Up Trophy',
    status: 'upcoming',
  },
  {
    id: 'round-6',
    title: 'Game 6: Grand Finale Coverall',
    patternIds: ['blackout'],
    allowRotations: false,
    preferredMode: 'rng',
    prizeNote: 'Grand Family Jackpot',
    status: 'upcoming',
  },
];

export function createInitialSessionState(sessionId = 'FAMILY'): GameSessionState {
  return {
    sessionId,
    eventTitle: 'Family Bingo Night',
    calledNumbers: [],
    activePatternIds: ['regular-line'],
    allowRotations: false,
    callingMode: 'rng',
    displayMode: 'multi',
    currentRoundTitle: DEFAULT_PLAYLIST[0].title,
    currentPrizeNote: DEFAULT_PLAYLIST[0].prizeNote,
    currentPlaylistIndex: 0,
    playlist: DEFAULT_PLAYLIST,
    customPatterns: [],
    winnerBanner: null,
    playerTheme: 'dark',
    autoDrawSeconds: 0,
    audio: DEFAULT_AUDIO_SETTINGS,
    updatedAt: Date.now(),
  };
}
