import { useState } from "react";
import { translateText } from "../services/translation";

function TranslationPage() {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError("");
    setTranslatedText("");

    try {
      const result = await translateText(inputText);
      setTranslatedText(result);
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
        <p className="text-center text-gray-500 mb-8">
          English → French
        </p>

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
          {isLoading ? "Translating..." : "Translate"}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {translatedText && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Translation (French)
            </label>
            <div className="w-full p-4 bg-white border border-gray-300 rounded-lg text-gray-800 whitespace-pre-wrap min-h-[100px]">
              {translatedText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TranslationPage;
