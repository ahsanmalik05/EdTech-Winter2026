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
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useQuery } from "../api/useQuery";

interface GenerationValidationEntry {
  id: number;
  templateId: number | null;
  userId: number | null;
  userEmail: string | null;
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
  // validation fields (null when no validation row)
  validationId: number | null;
  isValid: boolean | null;
  validationIssues: string[] | null;
  validationModel: string | null;
  validationStatus: string | null;
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs text-zinc-700 font-medium truncate">{value}</p>
    </div>
  );
}

function EntryRow({ entry }: { entry: GenerationValidationEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cost = fmtCost(entry.costUsd);
  const issueCount = entry.validationIssues?.length ?? 0;
  const isPending = entry.validationStatus === "pending";
  const hasMissingValidation = entry.validationId === null;
  const hasValidationIssues = issueCount > 0;

  const rowIcon = !entry.success
    ? <XCircle className="size-4 text-red-500 shrink-0" />
    : isPending
      ? <Clock className="size-4 text-blue-400 shrink-0 animate-pulse" />
      : hasMissingValidation
        ? <HelpCircle className="size-4 text-zinc-300 shrink-0" />
        : entry.isValid === false || hasValidationIssues
          ? <AlertTriangle className="size-4 text-amber-400 shrink-0" />
          : <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />;

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-50 transition-colors"
      >
        {rowIcon}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-800 shrink-0 truncate max-w-[200px]">
              {entry.subject}
            </span>
            <span className="text-xs text-zinc-400 shrink-0 truncate max-w-[160px]">
              {entry.topic}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 shrink-0">
              <GraduationCap className="size-3" />
              {entry.gradeLevel}
            </span>
            {hasMissingValidation && entry.success && (
              <span className="text-[10px] font-medium bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded shrink-0">
                no validation
              </span>
            )}
            {isPending && (
              <span className="text-[10px] font-medium bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded shrink-0">
                pending
              </span>
            )}
            {entry.isValid === false && (
              <span className="text-[10px] font-medium bg-red-50 text-red-500 px-1.5 py-0.5 rounded shrink-0">
                invalid
              </span>
            )}
            {hasValidationIssues && (
              <span className="text-[10px] font-medium bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded shrink-0">
                {issueCount} {issueCount === 1 ? "issue" : "issues"}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {entry.userEmail ?? (entry.userId ? `user ${entry.userId}` : "unknown")}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-2">
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
            <MetaItem label="Subject" value={entry.subject} />
            <MetaItem
              label="Topic"
              value={entry.topic}
            />
            <MetaItem label="Grade" value={entry.gradeLevel} />
            <MetaItem label="Latency" value={fmtLatency(entry.latencyMs)} />
            {cost && <MetaItem label="Cost" value={cost} />}
            {entry.tokenCount !== null && (
              <MetaItem label="Tokens" value={fmtTokens(entry.tokenCount) ?? "—"} />
            )}
            {entry.inputTokenCount !== null && (
              <MetaItem
                label="In / Out"
                value={`${fmtTokens(entry.inputTokenCount)} / ${fmtTokens(entry.outputTokenCount)}`}
              />
            )}
            {entry.templateId !== null && (
              <MetaItem label="Template ID" value={String(entry.templateId)} />
            )}
            <MetaItem label="Run #" value={String(entry.id)} />
          </div>

          {/* Generation error */}
          {!entry.success && entry.errorMessage && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Generation error</p>
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 font-mono whitespace-pre-wrap">
                {entry.errorMessage}
              </p>
            </div>
          )}

          {/* Validation details */}
          {entry.validationId !== null ? (
            isPending ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Validation
                </p>
                <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-blue-50 text-blue-600">
                  <Clock className="size-3 animate-pulse" />
                  Pending — validation is running
                </span>
              </div>
            ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Validation
              </p>
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs",
                    entry.isValid
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-600",
                  )}
                >
                  {entry.isValid ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  {entry.isValid ? "Valid" : "Invalid"}
                </span>
                {entry.validationModel && (
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-zinc-100 text-zinc-500">
                    via {entry.validationModel}
                  </span>
                )}
              </div>

              {issueCount > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Issues</p>
                  <ul className="space-y-1">
                    {entry.validationIssues!.map((issue, i) => (
                      <li
                        key={i}
                        className="text-xs text-red-600 flex items-start gap-1.5"
                      >
                        <XCircle className="size-3 mt-0.5 shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            )
          ) : entry.success ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <HelpCircle className="size-3.5" />
              No validation record found for this generation run.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function AdminGenerationValidations() {
  const [successFilter, setSuccessFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [validationFilter, setValidationFilter] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const queryParams = new URLSearchParams();
  if (appliedFilters.model && appliedFilters.model !== "all")
    queryParams.set("model", appliedFilters.model);
  if (appliedFilters.success && appliedFilters.success !== "all")
    queryParams.set("success", appliedFilters.success);
  if (appliedFilters.validationStatus && appliedFilters.validationStatus !== "all")
    queryParams.set("validationStatus", appliedFilters.validationStatus);
  const queryString = queryParams.toString();
  const url = `/api/admin/generation-validations${queryString ? `?${queryString}` : ""}`;

  const { data, loading, error, refetch } = useQuery<{
    entries: GenerationValidationEntry[];
  }>(url);

  const entries = data?.entries ?? [];

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (validationFilter === "missing" && e.validationId !== null) return false;
      if (validationFilter === "invalid" && e.isValid !== false) return false;
      if (validationFilter === "pending" && e.validationStatus !== "pending") return false;
      if (validationFilter === "issues" && (e.validationIssues?.length ?? 0) === 0)
        return false;
      return true;
    });
  }, [entries, validationFilter]);

  const models = useMemo(
    () => Array.from(new Set(entries.map((e) => e.model))).sort(),
    [entries],
  );

  const applyFilters = () => {
    setAppliedFilters({
      model: modelFilter,
      success: successFilter,
      validationStatus: validationFilter,
    });
  };

  const clearFilters = () => {
    setSuccessFilter("all");
    setModelFilter("all");
    setValidationFilter("all");
    setAppliedFilters({});
  };

  const hasActiveFilters =
    successFilter !== "all" || modelFilter !== "all" || validationFilter !== "all";

  const failedCount = entries.filter((e) => !e.success).length;
  const missingValidationCount = entries.filter(
    (e) => e.success && e.validationId === null,
  ).length;
  const invalidCount = entries.filter(
    (e) => e.validationId !== null && e.isValid === false,
  ).length;
  const issuesCount = entries.filter(
    (e) => (e.validationIssues?.length ?? 0) > 0,
  ).length;
  const pendingCount = entries.filter(
    (e) => e.validationStatus === "pending",
  ).length;

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Generation QA
          </h2>
          <p className="text-zinc-400 mt-1 text-sm">
            Inspect validation outcomes for every template generation run.
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
              setSuccessFilter("false");
              setAppliedFilters((prev) => ({ ...prev, success: "false" }));
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              appliedFilters.success === "false"
                ? "bg-zinc-800 text-white"
                : "bg-red-50 text-red-600 hover:bg-red-100",
            )}
          >
            <XCircle className="size-3" />
            {failedCount} failed
          </button>
          <button
            onClick={() => {
              setValidationFilter("invalid");
              setAppliedFilters((prev) => ({ ...prev, validationStatus: "invalid" }));
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              appliedFilters.validationStatus === "invalid"
                ? "bg-zinc-800 text-white"
                : "bg-amber-50 text-amber-600 hover:bg-amber-100",
            )}
          >
            <AlertTriangle className="size-3" />
            {invalidCount} invalid
          </button>
          <button
            onClick={() => {
              setValidationFilter("missing");
              setAppliedFilters((prev) => ({
                ...prev,
                validationStatus: "missing",
              }));
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              appliedFilters.validationStatus === "missing"
                ? "bg-zinc-800 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
            )}
          >
            <HelpCircle className="size-3" />
            {missingValidationCount} missing validation
          </button>
          {pendingCount > 0 && (
            <button
              onClick={() => {
                setValidationFilter("pending");
                setAppliedFilters((prev) => ({
                  ...prev,
                  validationStatus: "pending",
                }));
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                appliedFilters.validationStatus === "pending"
                  ? "bg-zinc-800 text-white"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100",
              )}
            >
              <Clock className="size-3" />
              {pendingCount} pending
            </button>
          )}
          {issuesCount > 0 && (
            <button
              onClick={() => {
                setValidationFilter("issues");
                setAppliedFilters((prev) => ({
                  ...prev,
                  validationStatus: "issues",
                }));
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                appliedFilters.validationStatus === "issues"
                  ? "bg-zinc-800 text-white"
                  : "bg-amber-50 text-amber-600 hover:bg-amber-100",
              )}
            >
              <BookOpen className="size-3" />
              {issuesCount} with issues
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2 mb-6 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider px-0.5">
            Status
          </label>
          <select
            value={successFilter}
            onChange={(e) => setSuccessFilter(e.target.value)}
            className="appearance-none bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 min-w-[140px]"
          >
            <option value="all">All statuses</option>
            <option value="true">Success only</option>
            <option value="false">Failed only</option>
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
            <option value="all">All</option>
            <option value="missing">Missing validation</option>
            <option value="pending">Pending</option>
            <option value="invalid">Invalid only</option>
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
          {filtered.length} / {entries.length}{" "}
          {entries.length === 1 ? "entry" : "entries"}
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
          <p className="text-zinc-400 text-sm">
            No entries match the current filters
          </p>
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
