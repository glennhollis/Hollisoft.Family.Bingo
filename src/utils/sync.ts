import type { GameSessionState } from '../types/bingo';

const CHANNEL_NAME = 'family_bingo_hall_sync_v1';
const STORAGE_KEY_PREFIX = 'family_bingo_state_';
const SAVED_CARDS_KEY = 'family_bingo_saved_cards_v1';
const CUSTOM_PERM_KEY = 'family_bingo_custom_perms_v1';

export function getStorageKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

export function saveStateLocally(state: GameSessionState): void {
  try {
    localStorage.setItem(getStorageKey(state.sessionId), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadStateLocally(sessionId: string): GameSessionState | null {
  try {
    const raw = localStorage.getItem(getStorageKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as GameSessionState;
  } catch {
    return null;
  }
}

export function broadcastState(state: GameSessionState): void {
  saveStateLocally(state);

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: 'STATE_UPDATE', state });
      ch.close();
    } catch {
      // Ignore BroadcastChannel errors
    }
  }

  // Also publish to server SSE bridge for cross-device / multi-browser Player Screens
  fetch(`/api/session/${encodeURIComponent(state.sessionId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  }).catch(() => {
    // Offline or standalone static mode - local sync still works
  });
}

export function subscribeToStateUpdates(
  sessionId: string,
  onState: (state: GameSessionState) => void
): () => void {
  const cleanups: (() => void)[] = [];

  // 1. BroadcastChannel (instant same-browser multi-monitor sync)
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.onmessage = (ev) => {
        if (ev.data?.type === 'STATE_UPDATE' && ev.data.state?.sessionId === sessionId) {
          onState(ev.data.state as GameSessionState);
        }
      };
      cleanups.push(() => ch.close());
    } catch {
      // Ignore
    }
  }

  // 2. Storage event (fallback across tabs on same origin)
  const storageKey = getStorageKey(sessionId);
  const handleStorage = (ev: StorageEvent) => {
    if (ev.key === storageKey && ev.newValue) {
      try {
        onState(JSON.parse(ev.newValue) as GameSessionState);
      } catch {
        // Ignore
      }
    }
  };
  window.addEventListener('storage', handleStorage);
  cleanups.push(() => window.removeEventListener('storage', handleStorage));

  // 3. Server SSE stream (cross-device / separate TV browser sync)
  if (typeof EventSource !== 'undefined') {
    try {
      const es = new EventSource(`/api/session/${encodeURIComponent(sessionId)}/stream`);
      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data);
          if (parsed?.state && parsed.state.sessionId === sessionId) {
            onState(parsed.state as GameSessionState);
          }
        } catch {
          // Ignore malformed event
        }
      };
      cleanups.push(() => es.close());
    } catch {
      // Ignore
    }
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}

export async function fetchInitialServerState(sessionId: string): Promise<GameSessionState | null> {
  try {
    const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.state as GameSessionState) || null;
  } catch {
    return null;
  }
}

export { SAVED_CARDS_KEY, CUSTOM_PERM_KEY };
