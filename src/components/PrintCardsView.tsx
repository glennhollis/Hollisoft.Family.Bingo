import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import type { PermSeriesId } from '../types/bingo';
import { BINGO_LETTERS } from '../data/patterns';
import { PERM_SERIES_LIST, generatePermCard } from '../utils/permEngine';

interface PrintCardsViewProps {
  eventTitle: string;
}

export function PrintCardsView({ eventTitle }: PrintCardsViewProps) {
  const [seriesId, setSeriesId] = useState<PermSeriesId>('standard-9000');
  const [startSerial, setStartSerial] = useState(1);
  const [cardCount, setCardCount] = useState(8);
  const [cardsPerPage, setCardsPerPage] = useState<4 | 6>(4);
  const [customHeader, setCustomHeader] = useState(eventTitle || 'Family Bingo Night');

  const cards = useMemo(() => {
    const safeStart = Math.max(1, Math.min(8900, Math.floor(startSerial || 1)));
    const safeCount = Math.max(1, Math.min(60, Math.floor(cardCount || 4)));
    return Array.from({ length: safeCount }, (_, i) =>
      generatePermCard(safeStart + i, seriesId)
    ).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [seriesId, startSerial, cardCount]);

  const pages = useMemo(() => {
    const chunked: typeof cards[] = [];
    for (let i = 0; i < cards.length; i += cardsPerPage) {
      chunked.push(cards.slice(i, i + cardsPerPage));
    }
    return chunked;
  }, [cards, cardsPerPage]);

  return (
    <div className="space-y-6">
      {/* Controls - Hidden during print */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Printable Family Card Packs</h2>
            <p className="text-xs text-slate-500">
              Print cards from the 9,000-series perm registry. Every card prints with its matching Serial # for instant verification in Ticket Check.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print {cards.length} Cards
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label htmlFor="print-header" className="block text-xs font-semibold text-slate-700 mb-1">
              Card Header Title
            </label>
            <input
              id="print-header"
              type="text"
              value={customHeader}
              onChange={(e) => setCustomHeader(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label htmlFor="print-series" className="block text-xs font-semibold text-slate-700 mb-1">
              Perm Series
            </label>
            <select
              id="print-series"
              value={seriesId}
              onChange={(e) => setSeriesId(e.target.value as PermSeriesId)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
            >
              {PERM_SERIES_LIST.filter((s) => s.id !== 'custom-import').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="print-start" className="block text-xs font-semibold text-slate-700 mb-1">
              Starting Serial #
            </label>
            <input
              id="print-start"
              type="number"
              min={1}
              max={8900}
              value={startSerial}
              onChange={(e) => setStartSerial(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono-num text-sm"
            />
          </div>

          <div>
            <label htmlFor="print-count" className="block text-xs font-semibold text-slate-700 mb-1">
              Number of Cards
            </label>
            <input
              id="print-count"
              type="number"
              min={1}
              max={60}
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono-num text-sm"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1">Cards Per Page</span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 h-10">
              <button
                type="button"
                onClick={() => setCardsPerPage(4)}
                className={`rounded-md text-xs font-semibold cursor-pointer ${
                  cardsPerPage === 4 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                4-Up
              </button>
              <button
                type="button"
                onClick={() => setCardsPerPage(6)}
                className={`rounded-md text-xs font-semibold cursor-pointer ${
                  cardsPerPage === 6 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                6-Up
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Sheets */}
      <div className="space-y-8">
        {pages.map((pageCards, pageIdx) => (
          <div
            key={pageIdx}
            className={`print-card-page bg-white rounded-xl border border-slate-200 p-6 grid gap-5 ${
              cardsPerPage === 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {pageCards.map((card) => (
              <div
                key={card.serial}
                className="border-2 border-slate-900 rounded-xl p-3.5 bg-white flex flex-col gap-2"
              >
                <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                  <span className="font-display font-bold text-sm text-slate-900 truncate">
                    {customHeader || 'Family Bingo'}
                  </span>
                  <span className="font-mono-num text-xs font-bold text-slate-700">
                    PERM #{String(card.serial).padStart(4, '0')}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {BINGO_LETTERS.map((l) => (
                    <div
                      key={l}
                      className="h-8 rounded bg-slate-900 text-white font-display font-extrabold text-lg flex items-center justify-center"
                    >
                      {l}
                    </div>
                  ))}
                  {card.grid.map((row, r) =>
                    row.map((num, c) => {
                      const isFree = r === 2 && c === 2;
                      return (
                        <div
                          key={`${r}-${c}`}
                          className={`h-11 rounded border border-slate-400 flex flex-col items-center justify-center font-mono-num ${
                            isFree ? 'bg-slate-100' : 'bg-white'
                          }`}
                        >
                          {isFree ? (
                            <>
                              <span className="text-[10px] font-display font-extrabold text-slate-900">
                                FREE
                              </span>
                              <span className="text-[8px] font-mono-num text-slate-500">
                                #{card.serial}
                              </span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-slate-900">{num}</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
