import { useMemo } from 'react';
import { Loader2, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useQuery } from '../api/useQuery';

interface TemplateGenerationLogEntry {
  id: number;
  templateId: number | null;
  userId: number | null;
  subject: string;
  topic: string;
  gradeLevel: string;
  model: string;
  success: boolean;
  errorMessage: string | null;
  latencyMs: number;
  createdAt: string;
}

export function TemplateGenerationLog() {
  const { data: entries = [], loading, error, refetch } = useQuery<TemplateGenerationLogEntry[]>(
    '/api/template-generation-log',
    { select: (raw) => raw.log || [] },
  );

  const sorted = useMemo(
    () => [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries],
  );

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-900 text-balance">Template Generation Log</h2>
        <p className="text-zinc-400 mt-1 text-sm text-pretty">
          Review template generation attempts with status, model, and latency.
        </p>
      </div>

      <div className="flex items-center justify-end mb-6">
        <span className="text-xs text-zinc-400 tabular-nums">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => refetch()}
            className="text-red-300 hover:text-red-500 transition-colors text-xs"
          >
            Retry
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
          <p className="text-zinc-400 text-sm">No generation log entries found</p>
          <p className="text-zinc-300 text-xs mt-1">Entries appear after generating templates</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((entry) => (
            <div key={entry.id} className="border border-zinc-200 rounded-lg bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                {entry.success ? (
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="size-4 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 truncate">
                    {entry.subject} - {entry.topic} ({entry.gradeLevel})
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-400 font-mono">{entry.model}</span>
                    <span className="text-zinc-200">·</span>
                    <span className="text-xs text-zinc-400 tabular-nums flex items-center gap-1">
                      <Clock className="size-3" />
                      {entry.latencyMs < 1000 ? `${entry.latencyMs}ms` : `${(entry.latencyMs / 1000).toFixed(1)}s`}
                    </span>
                    {entry.templateId !== null && (
                      <>
                        <span className="text-zinc-200">·</span>
                        <span className="text-xs text-zinc-400">Template #{entry.templateId}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-xs text-zinc-300 shrink-0">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </div>
              {!entry.success && entry.errorMessage && (
                <p className="mt-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-2 py-1">
                  {entry.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
