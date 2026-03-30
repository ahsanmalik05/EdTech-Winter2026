import { useState, useMemo } from 'react';
import { Loader2, Search, Trash2, X, FileText, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../api/api';
import { useQuery, invalidateQuery } from '../api/useQuery';

interface LogEntry {
  id: number;
  userId: number;
  sourceText: string;
  translatedText: string | null;
  targetLanguage: string;
  model: string;
  tokenCount: number | null;
  latencyMs: number;
  createdAt: string;
}

export function TranslationLog() {
  const [langFilter, setLangFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const queryUrl = activeFilter
    ? `/api/translation-log/filter?target_language=${encodeURIComponent(activeFilter)}`
    : '/api/translation-log';

  const { data: entries = [], loading, error, refetch } = useQuery<LogEntry[]>(
    queryUrl,
    { select: (raw) => raw.log || [] },
  );

  const handleFilter = () => {
    setActiveFilter(langFilter.trim());
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(`/api/translation-log/${id}`);
      invalidateQuery(queryUrl);
      refetch();
      if (expandedId === id) setExpandedId(null);
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  const sorted = useMemo(
    () => [...entries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [entries],
  );

  const languages = useMemo(
    () => Array.from(new Set(entries.map((e) => e.targetLanguage))).sort(),
    [entries],
  );

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-900 text-balance">
          Translation Log
        </h2>
        <p className="text-zinc-400 mt-1 text-sm text-pretty">
          Browse individual translation entries and filter by language.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative">
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="appearance-none bg-white border border-zinc-200 rounded-lg pl-3 pr-8 py-2 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 min-w-[160px]"
          >
            <option value="">All languages</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleFilter}
          className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Search className="size-3.5" />
          Filter
        </button>
        {langFilter && (
          <button
            onClick={() => {
              setLangFilter('');
              setActiveFilter('');
            }}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Clear filter
          </button>
        )}
        <div className="flex-1" />
        <span className="text-xs text-zinc-400 tabular-nums">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => refetch()} className="text-red-300 hover:text-red-500 transition-colors">
            <X className="size-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="size-5 text-zinc-300 animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="border border-zinc-200 rounded-lg p-12 text-center">
          <FileText className="size-6 text-zinc-200 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">No log entries found</p>
          <p className="text-zinc-300 text-xs mt-1">
            Translations will appear here after processing
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const isSuccess = !!entry.translatedText;
            return (
              <div
                key={entry.id}
                className="border border-zinc-200 rounded-lg overflow-hidden bg-white"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span
                    className={cn(
                      'size-2 rounded-full shrink-0',
                      isSuccess ? 'bg-emerald-400' : 'bg-red-400'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 truncate">
                      {entry.sourceText.slice(0, 120)}
                      {entry.sourceText.length > 120 && '…'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-400">{entry.targetLanguage}</span>
                      <span className="text-zinc-200">·</span>
                      <span className="text-xs text-zinc-400 font-mono">{entry.model}</span>
                      <span className="text-zinc-200">·</span>
                      <span className="text-xs text-zinc-400 tabular-nums flex items-center gap-1">
                        <Clock className="size-3" />
                        {entry.latencyMs < 1000
                          ? `${entry.latencyMs}ms`
                          : `${(entry.latencyMs / 1000).toFixed(1)}s`}
                      </span>
                      {entry.tokenCount !== null && (
                        <>
                          <span className="text-zinc-200">·</span>
                          <span className="text-xs text-zinc-400 tabular-nums">
                            {entry.tokenCount.toLocaleString()} tokens
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-300 shrink-0">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-zinc-100 px-4 py-3 space-y-3">
                    <div>
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                        Source
                      </span>
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap text-pretty leading-relaxed">
                        {entry.sourceText}
                      </p>
                    </div>
                    {entry.translatedText && (
                      <div>
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                          {entry.targetLanguage}
                        </span>
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap text-pretty leading-relaxed">
                          {entry.translatedText}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-zinc-300">
                        ID: {entry.id} · User #{entry.userId} · {new Date(entry.createdAt).toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleting === entry.id}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        {deleting === entry.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
