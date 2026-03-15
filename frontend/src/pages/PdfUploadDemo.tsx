import { useState } from 'react';

const SUPPORTED_LANGUAGES = [
    'French', 'Spanish', 'German', 'Italian', 'Portuguese',
    'Chinese (Simplified)', 'Japanese', 'Korean', 'Arabic', 'Hindi',
];

interface ProcessResult {
    originalName: string;
    targetLanguage: string;
    extractedText: string;
    translatedText: string;
}

type Tab = 'extracted' | 'translated';

export default function PdfUploadDemo() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [language, setLanguage] = useState('French');
    const [processing, setProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState<string>('');
    const [result, setResult] = useState<ProcessResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('translated');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type === 'application/pdf') {
                setSelectedFile(file);
                setError(null);
                setResult(null);
            } else {
                setError('Please select a PDF file');
                setSelectedFile(null);
            }
        }
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            setError('Please select a file first');
            return;
        }

        setProcessing(true);
        setError(null);
        setResult(null);
        setProcessingStep('Uploading PDF...');

        const formData = new FormData();
        formData.append('pdf', selectedFile);
        formData.append('language', language);

        try {
            const response = await fetch('http://localhost:3000/upload/pdf/stream', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok || !response.body) {
                throw new Error('Upload failed');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let extractedText = '';
            let translatedText = '';
            let originalName = '';
            let targetLanguage = language;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;

                    const eventMatch = line.match(/^event: (.+)\ndata: (.+)$/);
                    if (!eventMatch) continue;

                    const [, event, dataStr] = eventMatch;
                    const data = JSON.parse(dataStr);

                    switch (event) {
                        case 'status':
                            if (data.step === 'extracting') {
                                setProcessingStep('Extracting text from PDF...');
                            } else if (data.step === 'translating') {
                                setProcessingStep(`Translating to ${language}...`);
                            }
                            break;

                        case 'extracted':
                            extractedText = data.extractedText;
                            originalName = data.originalName;
                            targetLanguage = data.targetLanguage;
                            break;

                        case 'token':
                            translatedText += data.token;
                            setResult({
                                originalName: originalName || selectedFile.name,
                                targetLanguage,
                                extractedText,
                                translatedText,
                            });
                            setActiveTab('translated');
                            break;

                        case 'complete':
                            setProcessingStep('Complete!');
                            setTimeout(() => {
                                setProcessingStep('');
                                setProcessing(false);
                            }, 300);
                            break;

                        case 'error':
                            throw new Error(data.error || 'Processing failed');
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process PDF');
            setProcessingStep('');
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-dvh bg-gradient-to-br from-gray-50 to-white">
            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="space-y-2 mb-8">
                    <h1 className="text-3xl font-semibold text-balance">PDF Translation</h1>
                    <p className="text-gray-600 text-pretty">
                        Extract text from PDFs and translate to multiple languages instantly
                    </p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="pdf-input" className="block text-sm font-medium text-gray-700">
                                PDF Document
                            </label>
                            <div className="relative">
                                <input
                                    id="pdf-input"
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 file:transition-colors cursor-pointer"
                                />
                            </div>
                            {selectedFile && (
                                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                    <span className="size-1 rounded-full bg-green-500"></span>
                                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="language-select" className="block text-sm font-medium text-gray-700">
                                Target Language
                            </label>
                            <select
                                id="language-select"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="block w-full rounded border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
                            >
                                {SUPPORTED_LANGUAGES.map((lang) => (
                                    <option key={lang} value={lang}>{lang}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!selectedFile || processing}
                        className="w-full py-3 px-4 bg-black text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                    >
                        {processing ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                {processingStep || 'Processing…'}
                            </span>
                        ) : (
                            'Upload & Translate'
                        )}
                    </button>

                    {processing && processingStep && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="flex gap-1">
                                    <span className="size-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                                    <span className="size-1.5 bg-blue-600 rounded-full animate-pulse [animation-delay:0.2s]"></span>
                                    <span className="size-1.5 bg-blue-600 rounded-full animate-pulse [animation-delay:0.4s]"></span>
                                </div>
                                <p className="text-sm text-blue-800 font-medium">{processingStep}</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                            <span className="font-medium">Error:</span> {error}
                        </div>
                    )}
                </div>

                {result && (
                    <div className="mt-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <p className="text-sm text-gray-600">
                                <span className="font-medium text-gray-900">{result.originalName}</span>
                                <span className="mx-2 text-gray-400">→</span>
                                <span className="font-medium text-gray-900">{result.targetLanguage}</span>
                            </p>
                        </div>

                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab('translated')}
                                className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                    activeTab === 'translated'
                                        ? 'border-black text-black bg-white'
                                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                            >
                                Translated Text
                            </button>
                            <button
                                onClick={() => setActiveTab('extracted')}
                                className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                    activeTab === 'extracted'
                                        ? 'border-black text-black bg-white'
                                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                            >
                                Original Text
                            </button>
                        </div>

                        <div className="p-6">
                            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed text-pretty max-h-[32rem] overflow-y-auto">
                                {activeTab === 'translated' ? result.translatedText : result.extractedText}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
