import { useState, useMemo } from "react";
import {
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  DollarSign,
  ChevronDown,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useQuery } from "../api/useQuery";

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
  tokenCount: number | null;
  inputTokenCount: number | null;
  outputTokenCount: number | null;
  costUsd: string | null;
  latencyMs: number;
  createdAt: string;
}

function fmtLatency(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function fmtCost(raw: string | null): string | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  if (!isFinite(n) || n === 0) return null;
  if (n < 0.0001) return `$${n.toFixed(6)}`;
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(3)}`;
}

function fmtTokens(n: number | null): string | null {
  if (n === null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function TemplateGenerationLog() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const {
    data: entries = [],
    loading,
    error,
    refetch,
  } = useQuery<TemplateGenerationLogEntry[]>("/api/template-generation-log", {
    select: (raw) => raw.log || [],
  });

  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [entries],
  );

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-900 text-balance">
          Template Generation Log
        </h2>
        <p className="text-zinc-400 mt-1 text-sm text-pretty">
          Review template generation attempts with status, model, latency, and
          token usage.
        </p>
      </div>

      <div className="flex items-center justify-end mb-6">
        <span className="text-xs text-zinc-400 tabular-nums">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
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
          <p className="text-zinc-400 text-sm">
            No generation log entries found
          </p>
          <p className="text-zinc-300 text-xs mt-1">
            Entries appear after generating templates
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const cost = fmtCost(entry.costUsd);
            const totalTokens = fmtTokens(entry.tokenCount);
            const hasDetails =
              entry.inputTokenCount !== null ||
              entry.outputTokenCount !== null ||
              entry.tokenCount !== null ||
              cost !== null;

            return (
              <div
                key={entry.id}
                className="border border-zinc-200 rounded-lg overflow-hidden bg-white"
              >
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-50 transition-colors"
                >
                  {entry.success ? (
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="size-4 text-red-500 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 truncate font-medium">
                      {entry.subject}
                      <span className="font-normal text-zinc-500">
                        {" "}
                        — {entry.topic}
                      </span>
                    </p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <GraduationCap className="size-3" />
                        {entry.gradeLevel}
                      </span>

                      <span className="text-zinc-200">·</span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {entry.model}
                      </span>

                      <span className="text-zinc-200">·</span>
                      <span className="text-xs text-zinc-400 tabular-nums flex items-center gap-1">
                        <Clock className="size-3" />
                        {fmtLatency(entry.latencyMs)}
                      </span>

                      {totalTokens && (
                        <>
                          <span className="text-zinc-200">·</span>
                          <span className="text-xs text-zinc-400 tabular-nums flex items-center gap-1">
                            <Zap className="size-3" />
                            {totalTokens}
                          </span>
                        </>
                      )}

                      {cost && (
                        <>
                          <span className="text-zinc-200">·</span>
                          <span className="text-xs text-emerald-600 tabular-nums font-medium flex items-center gap-0.5">
                            <DollarSign className="size-3" />
                            {cost.replace("$", "")}
                          </span>
                        </>
                      )}

                      {entry.templateId !== null && (
                        <>
                          <span className="text-zinc-200">·</span>
                          <span className="text-xs text-zinc-400 flex items-center gap-1">
                            <BookOpen className="size-3" />
                            Template #{entry.templateId}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-300">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                    {(hasDetails || !entry.success) && (
                      <ChevronDown
                        className={cn(
                          "size-3.5 text-zinc-300 transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    )}
                  </div>
                </button>

                {/* Expanded */}
                {isExpanded && (hasDetails || !entry.success) && (
                  <div className="border-t border-zinc-100 px-4 py-4 space-y-3">
                    {/* Error message */}
                    {!entry.success && entry.errorMessage && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-md px-3 py-2.5">
                        <XCircle className="size-3.5 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-600 leading-relaxed">
                          {entry.errorMessage}
                        </p>
                      </div>
                    )}

                    {/* Token + cost breakdown */}
                    {hasDetails && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {entry.inputTokenCount !== null && (
                          <div className="bg-zinc-50 rounded-md px-3 py-2">
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-0.5">
                              Input tokens
                            </p>
                            <p className="text-sm font-semibold text-zinc-800 tabular-nums">
                              {fmtTokens(entry.inputTokenCount)}
                            </p>
                          </div>
                        )}
                        {entry.outputTokenCount !== null && (
                          <div className="bg-zinc-50 rounded-md px-3 py-2">
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-0.5">
                              Output tokens
                            </p>
                            <p className="text-sm font-semibold text-zinc-800 tabular-nums">
                              {fmtTokens(entry.outputTokenCount)}
                            </p>
                          </div>
                        )}
                        {entry.tokenCount !== null && (
                          <div className="bg-zinc-50 rounded-md px-3 py-2">
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-0.5">
                              Total tokens
                            </p>
                            <p className="text-sm font-semibold text-zinc-800 tabular-nums">
                              {fmtTokens(entry.tokenCount)}
                            </p>
                          </div>
                        )}
                        {cost && (
                          <div className="bg-emerald-50 rounded-md px-3 py-2">
                            <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-medium mb-0.5">
                              Est. cost
                            </p>
                            <p className="text-sm font-semibold text-emerald-700 tabular-nums">
                              {cost}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="pt-1 border-t border-zinc-100">
                      <span className="text-xs text-zinc-300">
                        ID: {entry.id}
                        {entry.userId !== null
                          ? ` · User #${entry.userId}`
                          : ""}{" "}
                        · {new Date(entry.createdAt).toLocaleString()}
                      </span>
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
