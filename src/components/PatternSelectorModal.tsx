import { useState } from 'react';
import { Check, Plus, RotateCw, Trash2, X } from 'lucide-react';
import type { BingoPattern, PatternCategory, PatternMask } from '../types/bingo';
import { PRESET_PATTERNS } from '../data/patterns';
import { PatternMatrix } from './PatternMatrix';

interface PatternSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePatternIds: string[];
  allowRotations: boolean;
  customPatterns: BingoPattern[];
  onApply: (patternIds: string[], allowRotations: boolean) => void;
  onSaveCustomPattern: (pattern: BingoPattern) => void;
  onDeleteCustomPattern: (id: string) => void;
}

function createEmptyCustomMask(): PatternMask {
  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => r === 2 && c === 2)
  );
}

export function PatternSelectorModal({
  isOpen,
  onClose,
  activePatternIds,
  allowRotations,
  customPatterns,
  onApply,
  onSaveCustomPattern,
  onDeleteCustomPattern,
}: PatternSelectorModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(activePatternIds);
  const [rotations, setRotations] = useState<boolean>(allowRotations);
  const [categoryFilter, setCategoryFilter] = useState<'all' | PatternCategory>('all');
  const [showBuilder, setShowBuilder] = useState(false);

  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customMask, setCustomMask] = useState<PatternMask>(createEmptyCustomMask);
  const [customRotatable, setCustomRotatable] = useState(false);

  if (!isOpen) return null;

  const allPatterns = [...PRESET_PATTERNS, ...customPatterns];
  const filteredPatterns =
    categoryFilter === 'all'
      ? allPatterns
      : allPatterns.filter((p) => p.category === categoryFilter);

  const togglePattern = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least 1 qualifying pattern
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const selectSinglePattern = (id: string) => {
    setSelectedIds([id]);
  };

  const handleToggleCustomCell = (r: number, c: number) => {
    setCustomMask((prev) =>
      prev.map((row, ri) =>
        row.map((val, ci) => (ri === r && ci === c ? !val : val))
      )
    );
  };

  const handleCreateCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const hasActiveCells = customMask.some((row) => row.some(Boolean));
    if (!hasActiveCells) return;

    const newPattern: BingoPattern = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      category: 'custom',
      description: customDesc.trim() || 'Custom family round pattern.',
      masks: [customMask],
      rotatable: customRotatable,
      isCustom: true,
    };

    onSaveCustomPattern(newPattern);
    setSelectedIds([newPattern.id]);
    setCustomName('');
    setCustomDesc('');
    setCustomMask(createEmptyCustomMask());
    setShowBuilder(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pattern-modal-title"
    >
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="pattern-modal-title" className="text-lg font-bold text-slate-900">
              Select Qualifying Bingo Patterns
            </h2>
            <p className="text-xs text-slate-500">
              Choose one or combine multiple patterns that qualify to win this round.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pattern selector"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
            {[
              { id: 'all', label: 'All Styles' },
              { id: 'classic', label: 'Classic' },
              { id: 'shapes', label: 'Letters & Shapes' },
              { id: 'specialty', label: 'Specialty' },
              { id: 'custom', label: 'Custom' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id as 'all' | PatternCategory)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  categoryFilter === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRotations((r) => !r)}
              aria-pressed={rotations}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                rotations
                  ? 'border-amber-500 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              Crazy Mode (Rotate Shapes): {rotations ? 'On' : 'Off'}
            </button>

            <button
              type="button"
              onClick={() => setShowBuilder((s) => !s)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {showBuilder ? 'Back to Presets' : 'Create Custom'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showBuilder ? (
            <div className="max-w-xl mx-auto space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Custom Pattern Designer</h3>
                <p className="text-xs text-slate-500">
                  Click squares on the 5x5 grid below to define which spaces must be marked to win.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <PatternMatrix
                    mask={customMask}
                    size="lg"
                    interactive
                    onToggleCell={handleToggleCustomCell}
                  />
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <label htmlFor="custom-pattern-name" className="block text-xs font-semibold text-slate-700 mb-1">
                      Pattern Name
                    </label>
                    <input
                      id="custom-pattern-name"
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g., Family Crest or Lucky 7"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-pattern-desc" className="block text-xs font-semibold text-slate-700 mb-1">
                      Short Description
                    </label>
                    <input
                      id="custom-pattern-desc"
                      type="text"
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      placeholder="Optional rule note shown to caller"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={customRotatable}
                      onChange={(e) => setCustomRotatable(e.target.checked)}
                      className="rounded border-slate-300 accent-blue-700"
                    />
                    Allow 90°/180°/270° rotations when Crazy Mode is enabled
                  </label>
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateCustom}
                      disabled={!customName.trim()}
                      className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                    >
                      Save & Select Pattern
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomMask(createEmptyCustomMask())}
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Clear Grid
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatterns.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-slate-500">
                  No custom patterns saved yet. Click "Create Custom" above to design one.
                </div>
              )}
              {filteredPatterns.map((pattern) => {
                const isSelected = selectedIds.includes(pattern.id);
                return (
                  <div
                    key={pattern.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'border-blue-700 bg-blue-50/50 ring-1 ring-blue-700'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {pattern.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {pattern.description}
                        </p>
                      </div>
                      <PatternMatrix
                        pattern={pattern}
                        allowRotations={rotations}
                        size="xs"
                        showHeader={false}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => selectSinglePattern(pattern.id)}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                      >
                        Play Only This
                      </button>

                      <div className="flex items-center gap-1.5">
                        {pattern.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCustomPattern(pattern.id);
                              setSelectedIds((prev) => prev.filter((x) => x !== pattern.id));
                            }}
                            aria-label={`Delete ${pattern.name}`}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => togglePattern(pattern.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-700 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {isSelected ? 'Included' : 'Include'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{selectedIds.length}</span> qualifying{' '}
            {selectedIds.length === 1 ? 'pattern' : 'patterns'} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(selectedIds, rotations);
                onClose();
              }}
              className="px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
            >
              Apply to Round
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
