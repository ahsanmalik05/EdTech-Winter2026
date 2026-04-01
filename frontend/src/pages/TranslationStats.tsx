import {
  Loader2,
  RefreshCw,
  Clock,
  Zap,
  Globe,
  Hash,
  Users,
  BarChart3,
  FileText,
  GraduationCap,
  BookOpen,
  DollarSign,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useQuery } from "../api/useQuery";
import { useState } from 'react';

interface TranslationStats {
  totalTranslations: number;
  translationsToday: number;
  successRate: number | null;
  byLanguage: { language: string; translations: number }[];
  byModel: { model: string; translations: number }[];
  averageLatencyMs: number | null;
  totalTokensUsed: number | null;
  averageTokensPerTranslation: number | null;
  tokensByLanguage: { language: string; totalTokens: number }[];
  topUsers: { userId: number; translations: number }[];
  cacheHitRate: null;
  totalCostUsd: number | null;
  worksheetStats: {
    totalGenerated: number;
    generatedToday: number;
    bySubject: { subject: string; count: number }[];
    byGradeLevel: { gradeLevel: string; count: number }[];
  };
  templatesByDay: { date: string; count: number }[];
  topSubjectTopicPairs: { subject: string; topic: string; count: number }[];
  templatesPerUser: {
    topCreators: { userId: number; count: number }[];
    averagePerUser: number | null;
  };
  gradeLevelBySubject: {
    subject: string;
    grades: { gradeLevel: string; count: number }[];
  }[];
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-zinc-200 rounded-lg p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="size-8 rounded-md bg-zinc-50 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold text-zinc-900 tabular-nums">
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-700 w-32 truncate shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-900 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 tabular-nums w-16 text-right shrink-0">
        {value.toLocaleString()}
        {suffix}
      </span>
    </div>
  );
}

export function TranslationStats() {
  const {
    data: stats,
    loading,
    error,
    refetch,
  } = useQuery<TranslationStats>("/api/translate/stat");

  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const fmt = (n: number | null | undefined) =>
    n !== null && n !== undefined ? n.toLocaleString() : "—";

  const fmtMs = (n: number | null | undefined) => {
    if (n === null || n === undefined) return "—";
    if (n < 1000) return `${Math.round(n)}ms`;
    return `${(n / 1000).toFixed(1)}s`;
  };

  const fmtPct = (n: number | null | undefined) =>
    n !== null && n !== undefined ? `${n}%` : "—";

  const fmtTokens = (n: number | null | undefined) => {
    if (n === null || n === undefined) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const fmtCost = (n: number | null | undefined) => {
    if (n === null || n === undefined || n === 0) return "—";
    if (n < 0.01) return `$${n.toFixed(4)}`;
    if (n < 1) return `$${n.toFixed(3)}`;
    return `$${n.toFixed(2)}`;
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 text-balance">
            Platform Stats
          </h2>
          <p className="text-zinc-400 mt-1 text-sm text-pretty">
            Usage metrics and analytics for translations and worksheet
            generation.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="size-5 text-zinc-300 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : stats ? (
        <div className="flex flex-col gap-8">
          {/* Overview cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard
              label="Total"
              value={fmt(stats.totalTranslations)}
              sub={`${fmt(stats.translationsToday)} today`}
              icon={<Hash className="size-4 text-zinc-400" />}
            />
            <StatCard
              label="Success Rate"
              value={fmtPct(stats.successRate)}
              icon={<BarChart3 className="size-4 text-zinc-400" />}
            />
            <StatCard
              label="Avg Latency"
              value={fmtMs(stats.averageLatencyMs)}
              icon={<Clock className="size-4 text-zinc-400" />}
            />
            <StatCard
              label="Tokens Used"
              value={fmtTokens(stats.totalTokensUsed)}
              sub={
                stats.averageTokensPerTranslation !== null
                  ? `~${Math.round(stats.averageTokensPerTranslation)} avg/translation`
                  : undefined
              }
              icon={<Zap className="size-4 text-zinc-400" />}
            />
            <StatCard
              label="Est. Cost"
              value={fmtCost(stats.totalCostUsd)}
              icon={<DollarSign className="size-4 text-zinc-400" />}
            />
          </div>

          {/* Language breakdown */}
          {stats.byLanguage.length > 0 && (
            <div className="border border-zinc-200 rounded-lg p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <Globe className="size-4 text-zinc-400" />
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  By Language
                </h3>
              </div>
              <div className="flex flex-col gap-2.5">
                {stats.byLanguage.map((item) => (
                  <BarRow
                    key={item.language}
                    label={item.language}
                    value={item.translations}
                    max={stats.byLanguage[0]?.translations ?? 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tokens by language */}
          {stats.tokensByLanguage.length > 0 && (
            <div className="border border-zinc-200 rounded-lg p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <Zap className="size-4 text-zinc-400" />
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Tokens by Language
                </h3>
              </div>
              <div className="flex flex-col gap-2.5">
                {stats.tokensByLanguage.map((item) => (
                  <BarRow
                    key={item.language}
                    label={item.language}
                    value={item.totalTokens}
                    max={stats.tokensByLanguage[0]?.totalTokens ?? 1}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Model usage */}
            {stats.byModel.length > 0 && (
              <div className="border border-zinc-200 rounded-lg p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <BarChart3 className="size-4 text-zinc-400" />
                  <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    By Model
                  </h3>
                </div>
                <div className="flex flex-col gap-2.5">
                  {stats.byModel.map((item) => (
                    <BarRow
                      key={item.model}
                      label={item.model}
                      value={item.translations}
                      max={stats.byModel[0]?.translations ?? 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Top users */}
            {stats.topUsers.length > 0 && (
              <div className="border border-zinc-200 rounded-lg p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <Users className="size-4 text-zinc-400" />
                  <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Top Users
                  </h3>
                </div>
                <div className="flex flex-col gap-2.5">
                  {stats.topUsers.map((item) => (
                    <BarRow
                      key={item.userId}
                      label={`User #${item.userId}`}
                      value={item.translations}
                      max={stats.topUsers[0]?.translations ?? 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {stats.totalTranslations === 0 && (
            <div className="border border-zinc-200 rounded-lg p-12 text-center">
              <BarChart3 className="size-6 text-zinc-200 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">
                No translations recorded yet
              </p>
              <p className="text-zinc-300 text-xs mt-1">
                Stats will appear here after your first translation
              </p>
            </div>
          )}

          {/* Worksheet Generation Stats */}
          {stats.worksheetStats && (
            <>
              <div className="border-t border-zinc-200 pt-8">
                <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                  Worksheet Generation
                </h3>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
                <StatCard
                  label="Worksheets Generated"
                  value={fmt(stats.worksheetStats.totalGenerated)}
                  sub={`${fmt(stats.worksheetStats.generatedToday)} today`}
                  icon={<FileText className="size-4 text-zinc-400" />}
                />
                <StatCard
                  label="Subjects"
                  value={fmt(stats.worksheetStats.bySubject.length)}
                  sub="unique subjects"
                  icon={<BookOpen className="size-4 text-zinc-400" />}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {stats.worksheetStats.bySubject.length > 0 && (
                  <div className="border border-zinc-200 rounded-lg p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <BookOpen className="size-4 text-zinc-400" />
                      <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        By Subject
                      </h3>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {stats.worksheetStats.bySubject.map((item) => (
                        <BarRow
                          key={item.subject}
                          label={item.subject}
                          value={item.count}
                          max={stats.worksheetStats.bySubject[0]?.count ?? 1}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {stats.worksheetStats.byGradeLevel.length > 0 && (
                  <div className="border border-zinc-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <GraduationCap className="size-4 text-zinc-400" />
                        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                          By Grade Level
                        </h3>
                      </div>
                      {stats.gradeLevelBySubject.length > 0 && (
                        <select
                          value={subjectFilter}
                          onChange={(e) => setSubjectFilter(e.target.value)}
                          className="text-xs border border-zinc-200 rounded-md px-2 py-1 text-zinc-600 bg-white"
                        >
                          <option value="all">All Subjects</option>
                          {stats.gradeLevelBySubject.map((s) => (
                            <option key={s.subject} value={s.subject}>{s.subject}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {(() => {
                        const filtered = subjectFilter === 'all'
                          ? stats.worksheetStats.byGradeLevel
                          : stats.gradeLevelBySubject
                              .find((s) => s.subject === subjectFilter)
                              ?.grades.map((g) => ({ gradeLevel: g.gradeLevel, count: g.count }))
                            ?? [];
                        return filtered.map((item) => (
                          <BarRow
                            key={item.gradeLevel}
                            label={item.gradeLevel}
                            value={item.count}
                            max={filtered[0]?.count ?? 1}
                          />
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {stats.worksheetStats.totalGenerated === 0 && (
                <div className="border border-zinc-200 rounded-lg p-12 text-center">
                  <FileText className="size-6 text-zinc-200 mx-auto mb-2" />
                  <p className="text-zinc-400 text-sm">
                    No worksheets generated yet
                  </p>
                  <p className="text-zinc-300 text-xs mt-1">
                    Stats will appear here after your first worksheet generation
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
