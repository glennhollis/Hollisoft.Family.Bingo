import type { AudioSettings } from '../types/bingo';
import { getLetterForNumber } from '../data/patterns';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  startTimeOffset: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine'
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + startTimeOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.01, volume * 0.28), now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playSoundCue(
  cue: 'ball' | 'newGame' | 'winner' | 'undo' | 'reset',
  settings: AudioSettings
) {
  if (!settings.soundCuesEnabled || settings.soundVolume <= 0) return;
  const v = Math.min(1, Math.max(0, settings.soundVolume));

  switch (cue) {
    case 'ball':
      // Crisp 2-note hall bell chime
      playTone(587.33, 0, 0.14, v, 'triangle'); // D5
      playTone(880.0, 0.07, 0.22, v * 0.85, 'sine'); // A5
      break;
    case 'newGame':
      // Warm ascending 3-note chime
      playTone(523.25, 0, 0.18, v, 'triangle'); // C5
      playTone(659.25, 0.1, 0.18, v, 'triangle'); // E5
      playTone(783.99, 0.2, 0.35, v, 'sine'); // G5
      break;
    case 'winner':
      // Celebratory major fanfare
      playTone(523.25, 0, 0.16, v, 'triangle'); // C5
      playTone(659.25, 0.1, 0.16, v, 'triangle'); // E5
      playTone(783.99, 0.2, 0.16, v, 'triangle'); // G5
      playTone(1046.5, 0.32, 0.45, v, 'triangle'); // C6
      playTone(783.99, 0.48, 0.14, v * 0.8, 'sine'); // G5
      playTone(1046.5, 0.6, 0.65, v, 'sine'); // C6 sustain
      break;
    case 'undo':
      // Soft descending correction tap
      playTone(440, 0, 0.1, v * 0.6, 'sine');
      playTone(349.23, 0.07, 0.14, v * 0.6, 'sine');
      break;
    case 'reset':
      // Clean descending sweep
      playTone(659.25, 0, 0.12, v * 0.7, 'sine');
      playTone(523.25, 0.08, 0.12, v * 0.7, 'sine');
      playTone(392.0, 0.16, 0.22, v * 0.7, 'sine');
      break;
  }
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

function speakText(text: string, settings: AudioSettings, delayMs = 0) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!settings.voiceEnabled) return;

  const run = () => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.min(1.6, Math.max(0.5, settings.voiceRate));
      utterance.pitch = Math.min(1.5, Math.max(0.6, settings.voicePitch));
      utterance.volume = Math.min(1, Math.max(0, settings.soundVolume || 1));

      if (settings.voiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const selected = voices.find((v) => v.voiceURI === settings.voiceURI);
        if (selected) {
          utterance.voice = selected;
        }
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors in restricted environments
    }
  };

  if (delayMs > 0) {
    window.setTimeout(run, delayMs);
  } else {
    run();
  }
}

export function announceBallCalled(num: number, settings: AudioSettings) {
  playSoundCue('ball', settings);
  if (!settings.voiceEnabled) return;

  const letter = getLetterForNumber(num);
  let phrase = `${letter}, ${num}`;
  if (settings.phraseStyle === 'classic') {
    phrase = `Under the ${letter}... ${letter} ${num}.`;
  } else if (settings.phraseStyle === 'double') {
    phrase = `${letter}, ${num}... ${letter}, ${num}!`;
  }

  // Slight delay if sound chime is active so chime doesn't overlap first syllable
  speakText(phrase, settings, settings.soundCuesEnabled ? 180 : 0);
}

export function announceGameEvent(
  event: 'newGame' | 'winner' | 'reset',
  settings: AudioSettings,
  detail?: string
) {
  playSoundCue(event, settings);
  if (!settings.voiceEnabled || !settings.announceEvents) return;

  let text = '';
  if (event === 'newGame') {
    text = detail ? `New game starting: ${detail}.` : 'New game starting. Good luck everyone!';
  } else if (event === 'winner') {
    text = detail ? `Bingo verified! ${detail}!` : 'Bingo verified! We have a winner!';
  } else if (event === 'reset') {
    text = 'Board cleared for the next round.';
  }

  if (text) {
    speakText(text, settings, settings.soundCuesEnabled ? 420 : 0);
  }
}

export function previewVoiceSettings(settings: AudioSettings) {
  const testSettings: AudioSettings = { ...settings, voiceEnabled: true };
  playSoundCue('ball', testSettings);
  const sample =
    settings.phraseStyle === 'classic'
      ? 'Under the N... N 42.'
      : settings.phraseStyle === 'double'
      ? 'N, 42... N, 42!'
      : 'N, 42';
  speakText(sample, testSettings, settings.soundCuesEnabled ? 180 : 0);
}
