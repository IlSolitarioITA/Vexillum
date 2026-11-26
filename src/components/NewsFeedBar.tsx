import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Newspaper, X } from 'lucide-react';
import { NewsCategory, NewsEvent } from '../types/game';

interface NewsFeedBarProps {
  news: NewsEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNation: (nationId: string) => void;
}

const CATEGORY_META: Record<NewsCategory, { label: string; color: string }> = {
  war: { label: 'Conflitto', color: 'text-rose-400' },
  diplomacy: { label: 'Diplomazia', color: 'text-cyan-300' },
  economy: { label: 'Economia', color: 'text-amber-300' },
  covert: { label: 'Intelligence', color: 'text-violet-300' },
  global: { label: 'Scenario', color: 'text-emerald-300' },
};

const FILTER_TABS: Array<{ id: 'all' | NewsCategory; label: string }> = [
  { id: 'all', label: 'Tutti' },
  { id: 'war', label: 'Guerre' },
  { id: 'covert', label: 'Intelligence' },
  { id: 'diplomacy', label: 'Diplomazia' },
  { id: 'economy', label: 'Economia' },
];

export const NewsFeedBar: React.FC<NewsFeedBarProps> = ({
  news,
  open,
  onOpenChange,
  onSelectNation,
}) => {
  const [filter, setFilter] = useState<'all' | NewsCategory>('all');

  const latest = news[0];
  const filtered = filter === 'all' ? news : news.filter((item) => item.category === filter);

  const renderNewsList = (closeOnSelect: boolean) => (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-slate-800/70 pb-[max(2rem,env(safe-area-inset-bottom))] md:pb-4">
      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-xs text-slate-400 text-center">
          Nessun evento registrato in questa categoria.
        </div>
      ) : (
        filtered.map((item) => {
          const cat = CATEGORY_META[item.category];
          const clickableId = item.nationIds?.[0];
          return (
            <button
              key={item.id}
              type="button"
              disabled={!clickableId}
              onClick={() => {
                if (clickableId) {
                  if (closeOnSelect) onOpenChange(false);
                  onSelectNation(clickableId);
                }
              }}
              className={`w-full text-left px-4 py-3.5 space-y-1 transition-colors ${
                clickableId
                  ? 'hover:bg-slate-800/50 active:bg-slate-800/80 cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className={`font-semibold ${cat.color}`}>{cat.label}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">{item.dateLabel}</span>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-100 whitespace-normal leading-snug">
                {item.headline}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-normal">
                {item.detail}
              </p>
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Dedicated Bottom Sheet for Cronaca / Notizie */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cronaca Geopolitica"
          onClick={() => onOpenChange(false)}
          className="md:hidden fixed inset-0 z-40 flex items-end bg-slate-950/70 backdrop-blur-[2px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[82dvh] rounded-t-2xl bg-[#0D1524] border-t border-slate-700/80 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-700" />
            </div>

            {/* Fixed Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Newspaper className="w-5 h-5 text-amber-400 shrink-0" />
                <h2 className="font-display text-2xl font-bold tracking-wide text-slate-50 leading-none truncate">
                  Cronaca Geopolitica
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Chiudi cronaca"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800/80 text-slate-200 hover:bg-slate-700 active:bg-slate-600 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Horizontal Single-Tap Filter Tabs (no truncation) */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/75 border-b border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter === tab.id
                      ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/45'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Body */}
            {renderNewsList(true)}
          </div>
        </div>
      )}

      {/* Desktop Dedicated Zone-3 Bottom Bar (in-flow shrink-0, never overlaps map) */}
      <div className="hidden md:block shrink-0 relative z-20 w-full bg-[#0A101D] border-t border-slate-800/90">
        {open && (
          <div className="absolute bottom-full left-3 mb-2 w-[520px] max-h-[56dvh] bg-[#0D1524]/98 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-100">Cronaca Geopolitica</h3>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Chiudi cronaca"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/60 border-b border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter === tab.id
                      ? 'bg-slate-700 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {renderNewsList(false)}
          </div>
        )}

        <div className="px-4 py-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
          >
            <Newspaper className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {latest ? (
              <div className="text-xs leading-snug whitespace-normal text-slate-200 group-hover:text-white">
                <span className="font-mono-num text-[11px] text-slate-400 mr-1.5">
                  {latest.dateLabel}
                </span>
                <span
                  className={`text-[11px] font-semibold mr-1.5 ${
                    CATEGORY_META[latest.category].color
                  }`}
                >
                  {CATEGORY_META[latest.category].label}
                </span>
                <span aria-hidden="true" className="text-slate-600 mr-1.5">
                  ·
                </span>
                <span>{latest.headline}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Cronaca Geopolitica</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{open ? 'Chiudi' : `Cronaca (${news.length})`}</span>
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </>
  );
};
