import { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, ChevronDown, Clock, X, FileText, Download, Trash2 } from 'lucide-react';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { cn } from '../lib/utils';
import { api } from '../api/api';
import { TemplatePDF } from '../components/TemplatePDF';
import { useQuery } from '../api/useQuery';

interface TemplateSections {
  introduction: string;
  model_assessment: string;
  self_review: string;
}

interface TemplateResponse {
  id: number;
  subject: string;
  topic: string;
  gradeLevel: string;
  version: number;
  isActive: boolean;
  sections: TemplateSections;
  createdAt: string;
  updatedAt: string;
}

function TemplateCard({
  template,
  expanded,
  onToggle,
  onViewPdf,
  onDelete,
  deleting,
}: {
  template: TemplateResponse;
  expanded: boolean;
  onToggle: () => void;
  onViewPdf: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      {/* Card header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-zinc-900 font-medium text-sm truncate">
              {template.subject} — {template.topic}
            </h3>
            <span className="shrink-0 text-[10px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded tabular-nums">
              v{template.version}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{template.gradeLevel}</span>
            <span className="text-zinc-200">·</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(template.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'size-4 text-zinc-300 shrink-0 ml-4 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-100">
          <div className="p-5 space-y-4">
            <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap text-pretty">
              {template.sections.introduction}
            </p>
            <hr className="border-zinc-100" />
            <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap text-pretty">
              {template.sections.model_assessment}
            </p>
            <hr className="border-zinc-100" />
            <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap text-pretty">
              {template.sections.self_review}
            </p>
          </div>

          {/* Actions */}
          <div className="px-5 pb-4 flex items-center gap-2">
            <button
              onClick={onViewPdf}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
            >
              <FileText className="size-3.5" />
              View PDF
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const LOADING_MESSAGES = [
  'Analyzing subject context…',
  'Structuring self-assessment framework…',
  'Generating introduction section…',
  'Writing model self-assessment…',
  'Composing self-review section…',
  'Running quality validation…',
  'Finalizing template…',
];

function useLoadingMessage(loading: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!loading) { setIndex(0); return; }
    const interval = setInterval(() => {
      setIndex((i) => (i < LOADING_MESSAGES.length - 1 ? i + 1 : i));
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);
  return LOADING_MESSAGES[index];
}

export function TemplateGenerator() {
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { data: templates = [], loading: loadingList, mutate: mutateTemplates } = useQuery<TemplateResponse[]>('/api/templates');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const loadingMessage = useLoadingMessage(loading);
  const [pdfTemplate, setPdfTemplate] = useState<TemplateResponse | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!subject.trim() || !gradeLevel.trim() || !topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/templates/generate', {
        subject: subject.trim(),
        gradeLevel: gradeLevel.trim(),
        topic: topic.trim(),
      });
      const created = res.data as TemplateResponse;
      mutateTemplates((prev) => [created, ...(prev ?? [])]);
      setExpandedId(created.id);
      setSubject('');
      setGradeLevel('');
      setTopic('');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/templates/${id}`);
      mutateTemplates((prev) => (prev ?? []).filter((t) => t.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  const canGenerate = subject.trim() && gradeLevel.trim() && topic.trim() && !loading;

  const handleDownloadPdf = useCallback(async (t: TemplateResponse) => {
    const blob = await pdf(<TemplatePDF template={t} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t.subject}-${t.topic}-template.pdf`.toLowerCase().replace(/\s+/g, '-');
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div>
      {/* Section header */}
      <div className="mb-8">
        <h2 className="font-display text-4xl text-zinc-900 text-balance">
          Template Generator
        </h2>
        <p className="text-zinc-400 mt-2 text-base text-pretty max-w-xl">
          Generate self-assessment scripts for any subject, topic, and grade level.
        </p>
      </div>

      {/* Generation form */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label htmlFor="gen-subject" className="block text-xs font-medium text-zinc-500 mb-1.5">
              Subject
            </label>
            <input
              id="gen-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-zinc-800 text-sm placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label htmlFor="gen-grade" className="block text-xs font-medium text-zinc-500 mb-1.5">
              Grade Level
            </label>
            <input
              id="gen-grade"
              type="text"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="e.g. 8th Grade"
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-zinc-800 text-sm placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label htmlFor="gen-topic" className="block text-xs font-medium text-zinc-500 mb-1.5">
              Topic
            </label>
            <input
              id="gen-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canGenerate && handleGenerate()}
              placeholder="e.g. Photosynthesis"
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-zinc-800 text-sm placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors',
            canGenerate
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Generate Template
            </>
          )}
        </button>
      </div>

      {/* Loading card */}
      {loading && (
        <div className="mb-6 bg-white border border-zinc-200 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 text-zinc-400 animate-spin shrink-0" />
            <div>
              <p className="text-zinc-700 text-sm font-medium">Generating template…</p>
              <p className="text-zinc-400 text-xs mt-0.5">{loadingMessage}</p>
            </div>
          </div>
          <div className="mt-3 h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-300 rounded-full" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-300 hover:text-red-500 transition-colors">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Templates list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Generated Templates
            {templates.length > 0 && (
              <span className="ml-1.5 tabular-nums">({templates.length})</span>
            )}
          </h3>
        </div>

        {loadingList ? (
          <div className="bg-white border border-zinc-200 rounded-lg p-12 flex items-center justify-center">
            <Loader2 className="size-4 text-zinc-300 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center">
            <p className="text-zinc-400 text-sm mb-0.5">No templates yet</p>
            <p className="text-zinc-300 text-xs">
              Fill in the form above to generate your first template
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                expanded={expandedId === t.id}
                onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                onViewPdf={() => setPdfTemplate(t)}
                onDelete={() => handleDelete(t.id)}
                deleting={deletingId === t.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {pdfTemplate && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="w-full max-w-5xl h-[85dvh] bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col shadow-xl shadow-zinc-200/50">
            {/* Modal header */}
            <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="size-4 text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-zinc-900 font-medium text-sm truncate">
                    {pdfTemplate.subject} — {pdfTemplate.topic}
                  </h3>
                  <p className="text-zinc-400 text-xs">{pdfTemplate.gradeLevel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadPdf(pdfTemplate)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                >
                  <Download className="size-3.5" />
                  Download
                </button>
                <button
                  onClick={() => setPdfTemplate(null)}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors"
                  aria-label="Close PDF viewer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* PDF embed */}
            <div className="flex-1 min-h-0 bg-zinc-50">
              <PDFViewer
                width="100%"
                height="100%"
                showToolbar={false}
                style={{ border: 'none' }}
              >
                <TemplatePDF template={pdfTemplate} />
              </PDFViewer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
