import { useState, useEffect, useRef, useCallback } from 'react';
import { FileUp, ArrowRight, Loader2, ChevronDown, FileText, X, Trash2, Languages, CheckCircle2, Download, Eye } from 'lucide-react';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { cn } from '../lib/utils';
import { getFontFamily } from '../lib/pdfFonts';
import { api } from '../api/api';
import { TranslationPDF } from '../components/TranslationPDF';
import { useQuery, invalidateQuery, invalidateQueries } from '../api/useQuery';

interface Language {
  id: number;
  code: string;
  name: string;
}

interface TranslationResult {
  translatedText: string;
  originalText?: string;
}

type FileStatus = 'idle' | 'extracting' | 'translating' | 'done' | 'error';

interface TranslationStudioProps {
  onBusyChange?: (busy: boolean) => void;
}

export function TranslationStudio({ onBusyChange }: TranslationStudioProps) {
  const { data: languages = [] } = useQuery<Language[]>(
    '/api/languages',
    { select: (raw) => Array.isArray(raw) ? raw : raw?.languages ?? [] },
  );
  const [targetLang, setTargetLang] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [results, setResults] = useState<Record<string, TranslationResult>>({});
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ fileName: string; result: TranslationResult } | null>(null);
  const [langSearch, setLangSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onBusyChange?.(loading);
  }, [loading, onBusyChange]);

  useEffect(() => {
    if (languages.length > 0 && !targetLang) {
      setTargetLang(languages[0].code);
    }
  }, [languages, targetLang]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLanguage = languages.find(l => l.code === targetLang);
  
  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    lang.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const addFiles = (newFiles: FileList | File[]) => {
    const pdfs = Array.from(newFiles).filter((f) => f.type === 'application/pdf');
    if (pdfs.length === 0) return;
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const unique = pdfs.filter((f) => !existingNames.has(f.name));
      return [...prev, ...unique];
    });
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setResults((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setFileStatuses((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleTranslate = async () => {
    if (files.length === 0 || !selectedLanguage) return;
    setLoading(true);
    setResults({});
    setError('');

    const initialStatuses: Record<string, FileStatus> = {};
    files.forEach((f) => { initialStatuses[f.name] = 'translating'; });
    setFileStatuses(initialStatuses);

    const translateOne = async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('language', selectedLanguage.name);

      try {
        const res = await api.post('/api/translate/pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        invalidateQuery('/api/translation-log');
        invalidateQuery('/api/admin/stats');
        invalidateQueries('/api/admin/translation-validations');

        setFileStatuses((prev) => ({ ...prev, [file.name]: 'done' }));
        setResults((prev) => ({
          ...prev,
          [file.name]: {
            translatedText: res.data.translatedText,
          },
        }));
      } catch {
        setFileStatuses((prev) => ({ ...prev, [file.name]: 'error' }));
      }
    };

    try {
      await Promise.all(files.map(translateOne));
    } catch (err: any) {
      setError(err.message || 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = useCallback(async (fileName: string, result: TranslationResult) => {
    const langName = selectedLanguage?.name || 'Translation';
    const fontFamily = getFontFamily(selectedLanguage?.code || 'en');
    const blob = await pdf(
      <TranslationPDF
        fileName={fileName}
        targetLanguage={langName}
        translatedText={result.translatedText}
        originalText={result.originalText}
        fontFamily={fontFamily}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.pdf$/i, '')}-${langName.toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedLanguage]);

  const canTranslate = files.length > 0 && !!selectedLanguage && !loading;

  const statusLabel = (status: FileStatus) => {
    switch (status) {
      case 'extracting': return 'Extracting text…';
      case 'translating': return 'Translating…';
      default: return '';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-display text-4xl text-zinc-900 text-balance">
          Translation Studio
        </h2>
        <p className="text-zinc-400 mt-2 text-base text-pretty max-w-xl">
          Batch translate PDF documents across languages.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Language selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:border-zinc-300 transition-colors min-w-[180px] justify-between"
          >
            <span className="flex items-center gap-2">
              <Languages className="size-3.5 text-zinc-400" />
              {selectedLanguage ? (
                <>
                  <span className="text-zinc-800 font-medium">{selectedLanguage.name}</span>
                  <span className="text-zinc-400 font-mono text-xs">{selectedLanguage.code}</span>
                </>
              ) : (
                <span className="text-zinc-400">Select language</span>
              )}
            </span>
            <ChevronDown className={cn('size-3.5 text-zinc-400 transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <div className="absolute z-20 top-full mt-1 w-full min-w-[240px] bg-white border border-zinc-200 rounded-lg shadow-lg shadow-zinc-100 overflow-hidden">
              <div className="p-2 border-b border-zinc-100">
                <input
                  type="text"
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  placeholder="Search languages..."
                  className="w-full px-2 py-1.5 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {filteredLanguages.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-zinc-400">
                    {languages.length === 0 ? 'No languages available' : 'No matches found'}
                  </p>
                ) : (
                  filteredLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setTargetLang(lang.code);
                        setDropdownOpen(false);
                        setLangSearch('');
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between',
                        targetLang === lang.code
                          ? 'bg-zinc-50 text-zinc-900 font-medium'
                          : 'text-zinc-600 hover:bg-zinc-50'
                      )}
                    >
                      <span>{lang.name}</span>
                      <span className="text-xs text-zinc-400 font-mono">{lang.code}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Grade level */}
        <input
          type="text"
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
          placeholder="Grade level (optional)"
          className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 w-44"
        />

        <div className="flex-1" />

        {/* Translate */}
        <button
          onClick={handleTranslate}
          disabled={!canTranslate}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors',
            canTranslate
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Translating…
            </>
          ) : (
            <>
              Translate {files.length > 0 && `(${files.length})`}
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-300 hover:text-red-500 transition-colors">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      {files.length === 0 && (
        <div
          className={cn(
            'border border-dashed rounded-lg p-12 flex flex-col items-center justify-center transition-colors',
            isDragging
              ? 'border-zinc-400 bg-zinc-50'
              : 'border-zinc-200 bg-white'
          )}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <div className="size-12 rounded-lg bg-zinc-50 flex items-center justify-center mb-3">
            <FileUp className="size-6 text-zinc-300" />
          </div>
          <p className="text-zinc-400 text-sm mb-1">Drop PDF files here or</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-zinc-900 text-sm font-medium hover:text-zinc-600 transition-colors"
          >
            browse files
          </button>
          <p className="text-zinc-300 text-xs mt-2">Upload one or more PDFs to translate</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((file) => {
            const result = results[file.name];
            const status = fileStatuses[file.name] || 'idle';
            const isProcessing = status === 'extracting' || status === 'translating';
            return (
              <div
                key={file.name}
                className="bg-white border border-zinc-200 rounded-lg overflow-hidden"
              >
                {/* File header */}
                <div className="px-4 py-2.5 flex items-center gap-3">
                  <FileText className="size-4 text-zinc-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 font-medium truncate">{file.name}</p>
                    <p className="text-xs text-zinc-400 tabular-nums">
                      {(file.size / 1024).toFixed(1)} KB
                      {isProcessing && (
                        <span className="ml-2 text-zinc-500">{statusLabel(status)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {result && (
                      <>
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        <button
                          onClick={() => setPdfPreview({ fileName: file.name, result })}
                          className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                          aria-label={`View ${file.name} translation as PDF`}
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(file.name, result)}
                          className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                          aria-label={`Download ${file.name} translation`}
                        >
                          <Download className="size-3.5" />
                        </button>
                      </>
                    )}
                    {isProcessing && (
                      <Loader2 className="size-3.5 text-zinc-300 animate-spin" />
                    )}
                    <button
                      onClick={() => removeFile(file.name)}
                      className="text-zinc-300 hover:text-red-400 transition-colors p-1"
                      aria-label={`Remove ${file.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Translation result */}
                {result && (
                  <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">
                      {selectedLanguage?.name}
                    </span>
                    <p className="text-zinc-700 text-sm leading-relaxed whitespace-pre-wrap text-pretty line-clamp-6">
                      {result.translatedText}
                    </p>
                    {result.translatedText.split('\n').length > 6 && (
                      <button
                        onClick={() => setPdfPreview({ fileName: file.name, result })}
                        className="text-xs text-zinc-400 hover:text-zinc-600 mt-2 transition-colors"
                      >
                        View full translation →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add more */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-dashed border-zinc-200 text-zinc-400 text-sm hover:border-zinc-300 hover:text-zinc-500 transition-colors"
          >
            <FileUp className="size-3.5" />
            Add more PDFs
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* Supported languages */}
      {languages.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Supported Languages
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setTargetLang(lang.code)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  targetLang === lang.code
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200'
                )}
              >
                {lang.name}
                <span className="ml-1 font-mono text-[10px] opacity-50">{lang.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfPreview && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="w-full max-w-5xl h-[85dvh] bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col shadow-xl shadow-zinc-200/50">
            {/* Modal header */}
            <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="size-4 text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-zinc-900 font-medium text-sm truncate">
                    {pdfPreview.fileName}
                  </h3>
                  <p className="text-zinc-400 text-xs">{selectedLanguage?.name} translation</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadPdf(pdfPreview.fileName, pdfPreview.result)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                >
                  <Download className="size-3.5" />
                  Download
                </button>
                <button
                  onClick={() => setPdfPreview(null)}
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
                <TranslationPDF
                  fileName={pdfPreview.fileName}
                  targetLanguage={selectedLanguage?.name || 'Translation'}
                  translatedText={pdfPreview.result.translatedText}
                  originalText={pdfPreview.result.originalText}
                  fontFamily={getFontFamily(selectedLanguage?.code || 'en')}
                />
              </PDFViewer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
