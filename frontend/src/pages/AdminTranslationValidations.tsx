import { useState, useMemo } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  Filter,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useQuery } from "../api/useQuery";

interface TranslationValidationEntry {
  id: number;
  userId: number;
  userEmail: string | null;
  sourceText: string;
  translatedText: string | null;
  sourceLanguage: string | null;
  targetLanguage: string;
  model: string;
  tokenCount: number | null;
  inputTokenCount: number | null;
  outputTokenCount: number | null;
  costUsd: string | null;
  latencyMs: number;
  cached: boolean;
  createdAt: string;
  // validation fields (null when no validation row)
  validationId: number | null;
  backTranslatedText: string | null;
  similarityScore: string | null;
  similarityReasoning: string | null;
  sectionCountMatch: boolean | null;
  originalSectionCount: number | null;
  translatedSectionCount: number | null;
  headersIntact: boolean | null;
  overallConfidence: string | null;
  translatorNotes: string | null;
  validationIssues: string[] | null;
  validatedAt: string | null;
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

function fmtConfidence(raw: string | null): { label: string; color: string } | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  if (!isFinite(n)) return null;
  const pct = Math.round(n * 100);
  if (n >= 0.8) return { label: `${pct}%`, color: "text-emerald-600" };
  if (n >= 0.6) return { label: `${pct}%`, color: "text-amber-500" };
  return { label: `${pct}%`, color: "text-red-500" };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function excerpt(text: string | null, max = 120): string {
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function CheckPill({
  pass,
  label,
}: {
  pass: boolean | null;
  label: string;
}) {
  if (pass === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-zinc-100 text-zinc-400">
        {label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs",
        pass
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-600",
      )}
    >
      {pass ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {label}
    </span>
  );
}

function EntryRow({ entry }: { entry: TranslationValidationEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cost = fmtCost(entry.costUsd);
  const conf = fmtConfidence(entry.overallConfidence);
  const issueCount = entry.validationIssues?.length ?? 0;
  const hasMissing = entry.validationId === null;

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-50 transition-colors"
      >
        {/* Status indicator */}
        {hasMissing ? (
          <HelpCircle className="size-4 text-zinc-300 shrink-0" />
        ) : entry.sectionCountMatch === false || entry.headersIntact === false || issueCount > 0 ? (
          <AlertTriangle className="size-4 text-amber-400 shrink-0" />
        ) : (
          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-800 shrink-0">
              {entry.targetLanguage}
            </span>
            <span className="text-xs text-zinc-400 shrink-0">
              {entry.userEmail ?? `user ${entry.userId}`}
            </span>
            {entry.cached && (
              <span className="text-[10px] font-medium bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded shrink-0">
                cached
              </span>
            )}
            {issueCount > 0 && (
              <span className="text-[10px] font-medium bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded shrink-0">
                {issueCount} {issueCount === 1 ? "issue" : "issues"}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 truncate mt-0.5">
            {excerpt(entry.sourceText, 80)}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-2">
          {conf && (
            <span className={cn("text-xs font-medium tabular-nums", conf.color)}>
              {conf.label}
            </span>
          )}
          <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-400">
            <Clock className="size-3" />
            {fmtLatency(entry.latencyMs)}
          </span>
          <span className="text-xs text-zinc-300 tabular-nums">
            {fmtDate(entry.createdAt)}
          </span>
          {expanded ? (
            <ChevronUp className="size-3.5 text-zinc-300" />
          ) : (
            <ChevronDown className="size-3.5 text-zinc-300" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 px-4 py-4 space-y-4 bg-zinc-50">
          {/* Run metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetaItem label="Model" value={entry.model} />
            <MetaItem label="Language" value={`${entry.sourceLanguage ?? "??"} → ${entry.targetLanguage}`} />
            <MetaItem label="Latency" value={fmtLatency(entry.latencyMs)} />
            {cost && <MetaItem label="Cost" value={cost} />}
            {entry.tokenCount !== null && (
              <MetaItem label="Tokens" value={fmtTokens(entry.tokenCount) ?? "—"} />
            )}
            {entry.inputTokenCount !== null && (
              <MetaItem label="In / Out" value={`${fmtTokens(entry.inputTokenCount)} / ${fmtTokens(entry.outputTokenCount)}`} />
            )}
            <MetaItem label="Cached" value={entry.cached ? "Yes" : "No"} />
            <MetaItem label="Run #" value={String(entry.id)} />
          </div>

          {/* Validation summary */}
          {entry.validationId !== null ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Validation
              </p>
              <div className="flex flex-wrap gap-2">
                <CheckPill pass={entry.sectionCountMatch} label="Section count" />
                <CheckPill pass={entry.headersIntact} label="Headers intact" />
                {entry.overallConfidence !== null && (
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs",
                    parseFloat(entry.overallConfidence) >= 0.8
                      ? "bg-emerald-50 text-emerald-700"
                      : parseFloat(entry.overallConfidence) >= 0.6
                        ? "bg-amber-50 text-amber-600"
                        : "bg-red-50 text-red-500"
                  )}>
                    Confidence {Math.round(parseFloat(entry.overallConfidence) * 100)}%
                  </span>
                )}
                {entry.similarityScore !== null && (
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-zinc-100 text-zinc-600">
                    Similarity {Math.round(parseFloat(entry.similarityScore) * 100)}%
                  </span>
                )}
              </div>

              {entry.sectionCountMatch === false && (
                <p className="text-xs text-amber-600">
                  Section count: {entry.originalSectionCount} original → {entry.translatedSectionCount} translated
                </p>
              )}

              {(entry.validationIssues?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Issues</p>
                  <ul className="space-y-1">
                    {entry.validationIssues!.map((issue, i) => (
                      <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                        <XCircle className="size-3 mt-0.5 shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.similarityReasoning && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Similarity reasoning</p>
                  <p className="text-xs text-zinc-600 whitespace-pre-wrap">{entry.similarityReasoning}</p>
                </div>
              )}

              {entry.translatorNotes && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Translator notes</p>
                  <p className="text-xs text-zinc-600 whitespace-pre-wrap">{entry.translatorNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <HelpCircle className="size-3.5" />
              No validation record found for this translation run.
            </div>
          )}

          {/* Text excerpts */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Content
            </p>
            <TextExcerpt label="Source" text={entry.sourceText} />
            <TextExcerpt label="Translated" text={entry.translatedText} />
            {entry.backTranslatedText && (
              <TextExcerpt label="Back-translated" text={entry.backTranslatedText} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs text-zinc-700 font-medium truncate">{value}</p>
    </div>
  );
}

function TextExcerpt({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs text-zinc-600 bg-white border border-zinc-100 rounded px-3 py-2 font-mono whitespace-pre-wrap line-clamp-4">
        {excerpt(text, 400)}
      </p>
    </div>
  );
}

export function AdminTranslationValidations() {
  const [langFilter, setLangFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [validationFilter, setValidationFilter] = useState("all");
  const [lowConfOnly, setLowConfOnly] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const queryParams = new URLSearchParams();
  if (appliedFilters.language && appliedFilters.language !== "all")
    queryParams.set("language", appliedFilters.language);
  if (appliedFilters.model && appliedFilters.model !== "all")
    queryParams.set("model", appliedFilters.model);
  if (appliedFilters.validationStatus && appliedFilters.validationStatus !== "all")
    queryParams.set("validationStatus", appliedFilters.validationStatus);
  const queryString = queryParams.toString();
  const url = `/api/admin/translation-validations${queryString ? `?${queryString}` : ""}`;

  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery<{ entries: TranslationValidationEntry[] }>(url);

  const entries = data?.entries ?? [];

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (validationFilter === "missing" && e.validationId !== null) return false;
      if (validationFilter === "issues") {
        const hasIssues =
          (e.validationIssues?.length ?? 0) > 0 ||
          e.sectionCountMatch === false ||
          e.headersIntact === false;
        if (!hasIssues) return false;
      }
      if (lowConfOnly) {
        const conf = e.overallConfidence ? parseFloat(e.overallConfidence) : null;
        if (conf === null || conf >= 0.7) return false;
      }
      return true;
    });
  }, [entries, validationFilter, lowConfOnly]);

  const languages = useMemo(
    () => Array.from(new Set(entries.map((e) => e.targetLanguage))).sort(),
    [entries],
  );

  const models = useMemo(
    () => Array.from(new Set(entries.map((e) => e.model))).sort(),
    [entries],
  );

  const applyFilters = () => {
    setAppliedFilters({
      language: langFilter,
      model: modelFilter,
      validationStatus: validationFilter,
    });
  };

  const clearFilters = () => {
    setLangFilter("all");
    setModelFilter("all");
    setValidationFilter("all");
    setLowConfOnly(false);
    setAppliedFilters({});
  };

  const hasActiveFilters =
    langFilter !== "all" ||
    modelFilter !== "all" ||
    validationFilter !== "all" ||
    lowConfOnly;

  const missingCount = entries.filter((e) => e.validationId === null).length;
  const issueCount = entries.filter(
    (e) =>
      e.validationId !== null &&
      ((e.validationIssues?.length ?? 0) > 0 ||
        e.sectionCountMatch === false ||
        e.headersIntact === false),
  ).length;
  const lowConfCount = entries.filter(
    (e) =>
      e.overallConfidence !== null &&
      parseFloat(e.overallConfidence) < 0.7,
  ).length;

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Translation QA
          </h2>
          <p className="text-zinc-400 mt-1 text-sm">
            Inspect validation outcomes for every translation run.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary pills */}
      {!loading && entries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => {
              setValidationFilter("missing");
              setAppliedFilters((prev) => ({ ...prev, validationStatus: "missing" }));
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              appliedFilters.validationStatus === "missing"
                ? "bg-zinc-800 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
            )}
          >
            <HelpCircle className="size-3" />
            {missingCount} missing validation
          </button>
          <button
            onClick={() => {
              setValidationFilter("issues");
              setAppliedFilters((prev) => ({ ...prev, validationStatus: "issues" }));
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              appliedFilters.validationStatus === "issues"
                ? "bg-zinc-800 text-white"
                : "bg-amber-50 text-amber-600 hover:bg-amber-100",
            )}
          >
            <AlertTriangle className="size-3" />
            {issueCount} with issues
          </button>
          <button
            onClick={() => setLowConfOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              lowConfOnly
                ? "bg-zinc-800 text-white"
                : "bg-red-50 text-red-600 hover:bg-red-100",
            )}
          >
            <XCircle className="size-3" />
            {lowConfCount} low confidence
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2 mb-6 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider px-0.5">
            Language
          </label>
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="appearance-none bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 min-w-[140px]"
          >
            <option value="all">All languages</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider px-0.5">
            Model
          </label>
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="appearance-none bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 min-w-[180px]"
          >
            <option value="all">All models</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider px-0.5">
            Validation
          </label>
          <select
            value={validationFilter}
            onChange={(e) => setValidationFilter(e.target.value)}
            className="appearance-none bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 min-w-[160px]"
          >
            <option value="all">All statuses</option>
            <option value="missing">Missing validation</option>
            <option value="issues">Has issues</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end pb-0.5">
          <button
            onClick={applyFilters}
            className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <Filter className="size-3.5" />
            Apply
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex-1" />
        <span className="text-xs text-zinc-400 tabular-nums self-end pb-0.5">
          {filtered.length} / {entries.length} {entries.length === 1 ? "entry" : "entries"}
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
      ) : filtered.length === 0 ? (
        <div className="border border-zinc-200 rounded-lg p-12 text-center">
          <CheckCircle2 className="size-6 text-zinc-200 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">No entries match the current filters</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
