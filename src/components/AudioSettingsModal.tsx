import { useEffect, useState } from 'react';
import { Volume2, X, Play } from 'lucide-react';
import type { AudioSettings } from '../types/bingo';
import { getAvailableVoices, previewVoiceSettings } from '../utils/audio';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audio: AudioSettings;
  onChange: (next: AudioSettings) => void;
}

export function AudioSettingsModal({ isOpen, onClose, audio, onChange }: AudioSettingsModalProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const load = () => {
      const list = getAvailableVoices();
      // Sort English voices first, then alphabetically
      const sorted = [...list].sort((a, b) => {
        const aEn = a.lang.toLowerCase().startsWith('en') ? 0 : 1;
        const bEn = b.lang.toLowerCase().startsWith('en') ? 0 : 1;
        if (aEn !== bEn) return aEn - bEn;
        return a.name.localeCompare(b.name);
      });
      setVoices(sorted);
    };
    load();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', load);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-settings-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-5 h-5 text-blue-700" aria-hidden="true" />
            <h2 id="audio-settings-title" className="text-lg font-bold text-slate-900">
              Audio & Voice Announcements
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audio settings"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Sound Effects / Cues */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Game Sound Cues</h3>
                <p className="text-xs text-slate-500">
                  Play chimes when calling balls, starting new rounds, clearing the board, or confirming a winner.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={audio.soundCuesEnabled}
                onClick={() => onChange({ ...audio, soundCuesEnabled: !audio.soundCuesEnabled })}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                  audio.soundCuesEnabled
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {audio.soundCuesEnabled ? 'On' : 'Muted'}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
                <label htmlFor="audio-volume">Master Volume</label>
                <span className="font-mono-num">{Math.round(audio.soundVolume * 100)}%</span>
              </div>
              <input
                id="audio-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={audio.soundVolume}
                onChange={(e) => onChange({ ...audio, soundVolume: Number(e.target.value) })}
                className="w-full accent-blue-700 cursor-pointer"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Voice / TTS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Spoken Ball Announcer</h3>
                <p className="text-xs text-slate-500">
                  Read each called letter and number aloud using browser text-to-speech.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={audio.voiceEnabled}
                onClick={() => onChange({ ...audio, voiceEnabled: !audio.voiceEnabled })}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                  audio.voiceEnabled
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {audio.voiceEnabled ? 'Speaking' : 'Off'}
              </button>
            </div>

            <div>
              <label htmlFor="voice-select" className="block text-xs font-medium text-slate-700 mb-1.5">
                Caller Voice
              </label>
              <select
                id="voice-select"
                value={audio.voiceURI}
                onChange={(e) => onChange({ ...audio, voiceURI: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">System Default Voice</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              {voices.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Using browser default speech voice (additional system voices may load after first test).
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
                  <label htmlFor="voice-rate">Announcement Speed</label>
                  <span className="font-mono-num">{audio.voiceRate.toFixed(2)}x</span>
                </div>
                <input
                  id="voice-rate"
                  type="range"
                  min={0.6}
                  max={1.5}
                  step={0.05}
                  value={audio.voiceRate}
                  onChange={(e) => onChange({ ...audio, voiceRate: Number(e.target.value) })}
                  className="w-full accent-blue-700 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                  <span>Slower</span>
                  <span>Normal</span>
                  <span>Faster</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
                  <label htmlFor="voice-pitch">Voice Pitch</label>
                  <span className="font-mono-num">{audio.voicePitch.toFixed(2)}</span>
                </div>
                <input
                  id="voice-pitch"
                  type="range"
                  min={0.8}
                  max={1.25}
                  step={0.05}
                  value={audio.voicePitch}
                  onChange={(e) => onChange({ ...audio, voicePitch: Number(e.target.value) })}
                  className="w-full accent-blue-700 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                  <span>Deep</span>
                  <span>Natural</span>
                  <span>Bright</span>
                </div>
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">Callout Phrasing</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'classic', label: 'Classic Hall', example: '"Under the N... N 42"' },
                  { id: 'concise', label: 'Concise', example: '"N, 42"' },
                  { id: 'double', label: 'Double Call', example: '"N 42... N 42"' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...audio,
                        phraseStyle: opt.id as AudioSettings['phraseStyle'],
                      })
                    }
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      audio.phraseStyle === opt.id
                        ? 'border-blue-700 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">{opt.example}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <div className="text-xs font-semibold text-slate-900">Announce Round Starts & Winners</div>
                <div className="text-[11px] text-slate-500">
                  Also speak aloud when starting a new game or confirming a winning card.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={audio.announceEvents}
                onClick={() => onChange({ ...audio, announceEvents: !audio.announceEvents })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                  audio.announceEvents
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {audio.announceEvents ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={() => previewVoiceSettings(audio)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            Test Voice & Chime
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
