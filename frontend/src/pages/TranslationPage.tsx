import { useState } from "react";
import { translateText, type TranslationResult } from "../services/translation";

const LOW_CONFIDENCE_THRESHOLD = 0.75;

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= LOW_CONFIDENCE_THRESHOLD
      ? "bg-green-100 text-green-800 border-green-300"
      : "bg-yellow-100 text-yellow-800 border-yellow-300";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${color}`}
      title="COMET reference-free quality score (0–1)"
    >
      <svg
        className="w-3 h-3"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="8" opacity="0.2" />
        <circle
          cx="8"
          cy="8"
          r="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${pct * 0.314} 31.4`}
          strokeLinecap="round"
          transform="rotate(-90 8 8)"
        />
      </svg>
      Confidence: {score.toFixed(2)}
    </span>
  );
}

function TranslationPage() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await translateText(inputText);
      setResult(data);
    } catch {
      setError("Translation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInputText(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-3xl w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Translation Demo
        </h1>
        <p className="text-center text-gray-500 mb-8">English → French</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload a text file
          </label>
          <input
            type="file"
            accept=".txt,.md,.csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Or type your text
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text in English..."
            rows={6}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-gray-800"
          />
        </div>

        <button
          onClick={handleTranslate}
          disabled={isLoading || !inputText.trim()}
          className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Translating…" : "Translate"}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6">
            {/* Low-confidence warning banner */}
            {result.lowConfidence && (
              <div
                role="alert"
                className="mb-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-sm"
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  ⚠
                </span>
                <span>
                  <strong>Low-confidence translation</strong> — the quality
                  score is below the recommended threshold (
                  {Math.round(LOW_CONFIDENCE_THRESHOLD * 100)}%). Please review
                  the output carefully before use.
                </span>
              </div>
            )}

            {/* Translation output header with confidence badge */}
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Translation (French)
              </label>
              <ConfidenceBadge score={result.confidence} />
            </div>

            <div className="w-full p-4 bg-white border border-gray-300 rounded-lg text-gray-800 whitespace-pre-wrap min-h-[100px]">
              {result.translatedText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TranslationPage;
