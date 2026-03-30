import { useState } from 'react';
import { Loader2, Plus, Trash2, Globe, X } from 'lucide-react';
import { api } from '../api/api';
import { useQuery, invalidateQueries } from '../api/useQuery';

interface Language {
  id: number;
  name: string;
  code: string;
}

export function LanguageManager() {
  const { data: languages = [], loading, refetch } = useQuery<Language[]>(
    '/api/languages',
    { select: (raw) => Array.isArray(raw) ? raw : raw?.languages ?? [] },
  );
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!name.trim() || !code.trim()) return;
    setAdding(true);
    setError('');
    try {
      await api.post('/api/languages', {
        name: name.trim(),
        code: code.trim().toLowerCase(),
      });
      setName('');
      setCode('');
      invalidateQueries('/api/languages');
      refetch();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add language');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(`/api/languages/${id}`);
      invalidateQueries('/api/languages');
      refetch();
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-900 text-balance">
          Languages
        </h2>
        <p className="text-zinc-400 mt-1 text-sm text-pretty">
          Manage supported languages for the translation service.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-300 hover:text-red-500 transition-colors">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Add language form */}
      <div className="border border-zinc-200 rounded-lg p-5 mb-8">
        <h3 className="text-sm font-medium text-zinc-900 mb-3">
          Add Language
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, e.g. French"
            className="flex-1 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 bg-white"
          />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' && name.trim() && code.trim() && !adding && handleAdd()
            }
            placeholder="Code, e.g. fr"
            className="w-28 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 font-mono placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 bg-white"
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim() || !code.trim() || adding}
            className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {adding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Plus className="size-4" />
                Add
              </>
            )}
          </button>
        </div>
      </div>

      {/* Languages list */}
      <div>
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Supported Languages
          {languages.length > 0 && (
            <span className="ml-1.5 tabular-nums">({languages.length})</span>
          )}
        </h3>

        {loading ? (
          <div className="border border-zinc-200 rounded-lg p-8 flex items-center justify-center">
            <Loader2 className="size-4 text-zinc-300 animate-spin" />
          </div>
        ) : languages.length === 0 ? (
          <div className="border border-zinc-200 rounded-lg p-8 text-center">
            <Globe className="size-6 text-zinc-200 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">No languages configured</p>
            <p className="text-zinc-300 text-xs mt-1">
              Add one above to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {languages.map((lang) => (
              <div
                key={lang.id}
                className="border border-zinc-200 rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium text-zinc-800">
                    {lang.name}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded">
                    {lang.code}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(lang.id)}
                  disabled={deleting === lang.id}
                  className="text-zinc-300 hover:text-red-400 transition-colors p-1.5 disabled:opacity-50"
                  aria-label={`Delete ${lang.name}`}
                >
                  {deleting === lang.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
