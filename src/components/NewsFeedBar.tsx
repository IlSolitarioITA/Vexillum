import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Newspaper } from 'lucide-react';
import { NewsCategory, NewsEvent } from '../types/game';

interface NewsFeedBarProps {
  news: NewsEvent[];
  onSelectNation: (nationId: string) => void;
}

const CATEGORY_META: Record<NewsCategory, { label: string; color: string }> = {
  war: { label: 'Conflitto', color: 'text-rose-400' },
  diplomacy: { label: 'Diplomazia', color: 'text-cyan-300' },
  economy: { label: 'Economia', color: 'text-amber-300' },
  covert: { label: 'Intelligence', color: 'text-violet-300' },
  global: { label: 'Scenario', color: 'text-emerald-300' },
};

export const NewsFeedBar: React.FC<NewsFeedBarProps> = ({ news, onSelectNation }) => {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | NewsCategory>('all');

  const latest = news[0];
  const filtered = filter === 'all' ? news : news.filter((item) => item.category === filter);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 pointer-events-none flex flex-col items-start">
      {expanded && (
        <div className="pointer-events-auto ml-3 mb-2 w-[calc(100vw-24px)] sm:w-[490px] max-h-[54vh] bg-[#0B1220]/96 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-amber-400 shrink-0" />
              <h3 className="text-xs font-semibold text-slate-100">Feed Geopolitico</h3>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { id: 'all', label: 'Tutti' },
                  { id: 'war', label: 'Guerre' },
                  { id: 'covert', label: 'Intelligence' },
                  { id: 'diplomacy', label: 'Diplomazia' },
                  { id: 'economy', label: 'Economia' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    filter === tab.id
                      ? 'bg-slate-700 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-xs text-slate-400 text-center">
                Nessun evento registrato in questa categoria.
              </div>
            ) : (
              filtered.map((item) => {
                const cat = CATEGORY_META[item.category];
                const clickableId = item.nationIds?.[0];
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (clickableId) onSelectNation(clickableId);
                    }}
                    className={`px-4 py-3 space-y-1 transition-colors ${
                      clickableId ? 'hover:bg-slate-800/50 cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className={`font-semibold ${cat.color}`}>{cat.label}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">{item.dateLabel}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-100 whitespace-normal leading-snug">
                      {item.headline}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed whitespace-normal">
                      {item.detail}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Non-truncated full-text Bottom Headline Bar */}
      <div className="pointer-events-auto w-full bg-[#0A101D]/94 backdrop-blur-md border-t border-slate-800/90 px-3 sm:px-4 pt-2 safe-bottom flex items-start sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-start sm:items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
        >
          <Newspaper className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
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
            <span className="text-xs text-slate-400">Feed Geopolitico</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white whitespace-nowrap shrink-0 cursor-pointer pt-0.5 sm:pt-0"
        >
          <span>{expanded ? 'Chiudi' : `Cronaca (${news.length})`}</span>
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
