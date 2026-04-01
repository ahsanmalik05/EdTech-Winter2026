import { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  Plus,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  Trash2,
  Info,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../api/api';

interface ApiKeyItem {
  id: number;
  label: string;
  publicKey: string;
  scopes: string[];
  createdAt: string;
}

interface StoredKey {
  id: number;
  rawKey: string;
}

interface KeySetupProps {
  onActivateKey: (key: string) => void;
  activeKey: string;
  onDeactivateKey: () => void;
}

function getStoredKeys(): StoredKey[] {
  try {
    return JSON.parse(localStorage.getItem('stored_keys') || '[]');
  } catch {
    return [];
  }
}

function saveStoredKeys(keys: StoredKey[]) {
  localStorage.setItem('stored_keys', JSON.stringify(keys));
}

export function KeySetup({ onActivateKey, activeKey, onDeactivateKey }: KeySetupProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [storedKeys, setStoredKeysState] = useState<StoredKey[]>(getStoredKeys);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<{
    raw: string;
    label: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualKey, setManualKey] = useState('');

  const updateStoredKeys = (updated: StoredKey[]) => {
    setStoredKeysState(updated);
    saveStoredKeys(updated);
  };

  const fetchKeys = async () => {
    try {
      const res = await api.get('/api/keys');
      setKeys(res.data.allKeys || []);
    } catch {
      setKeys([]);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const mergedKeys = useMemo(() => {
    return keys.map((k) => ({
      ...k,
      rawKey: storedKeys.find((s) => s.id === k.id)?.rawKey,
    }));
  }, [keys, storedKeys]);

  const activeKeyInList = activeKey
    ? mergedKeys.some((k) => k.rawKey === activeKey)
    : false;

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/api/keys', {
        label: newLabel.trim(),
        scopes: ['read', 'write', 'translate'],
      });
      const rawKey: string = res.data.api_key.key;
      const keyId: number = res.data.api_key.id;

      updateStoredKeys([...storedKeys, { id: keyId, rawKey }]);
      setJustCreated({ raw: rawKey, label: newLabel.trim() });
      setNewLabel('');
      fetchKeys();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (!justCreated) return;
    navigator.clipboard.writeText(justCreated.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: number) => {
    try {
      const stored = storedKeys.find((s) => s.id === id);
      if (stored?.rawKey === activeKey) {
        onDeactivateKey();
      }
      updateStoredKeys(storedKeys.filter((s) => s.id !== id));
      await api.delete(`/api/keys/${id}`);
      fetchKeys();
    } catch {
      // silent
    }
  };

  const handleToggle = (rawKey: string) => {
    if (rawKey === activeKey) {
      onDeactivateKey();
    } else {
      onActivateKey(rawKey);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-900 text-balance">
          API Keys
        </h2>
        <p className="text-zinc-400 mt-1 text-sm text-pretty">
          Manage your API keys for translation and generation.
        </p>
      </div>

      <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <Info className="size-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 text-pretty">
          <span className="font-medium">Demo mode:</span> Raw API keys are
          stored in your browser so you can switch between them. In a production
          app, keys are shown only once at creation and cannot be retrieved
          again.
        </p>
      </div>

      {justCreated && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-700">
              Key created — {justCreated.label}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="font-mono text-xs text-emerald-800 bg-emerald-100 rounded px-3 py-2 break-all select-all">
            {justCreated.raw}
          </p>
          <div className="mt-3 flex items-center gap-3">
            {justCreated.raw === activeKey ? (
              <span className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                <Check className="size-3.5" />
                Active
              </span>
            ) : (
              <button
                onClick={() => onActivateKey(justCreated.raw)}
                className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Use This Key
                <ArrowRight className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="border border-zinc-200 rounded-lg p-5 mb-8">
        <h3 className="text-sm font-medium text-zinc-900 mb-3">
          Create New Key
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' &&
              newLabel.trim() &&
              !creating &&
              handleCreate()
            }
            placeholder="Key label, e.g. Development"
            className="flex-1 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 bg-white"
          />
          <button
            onClick={handleCreate}
            disabled={!newLabel.trim() || creating}
            className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Plus className="size-4" />
                Create
              </>
            )}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Your Keys
          {mergedKeys.length > 0 && (
            <span className="ml-1.5 tabular-nums">({mergedKeys.length})</span>
          )}
        </h3>

        {loadingKeys ? (
          <div className="border border-zinc-200 rounded-lg p-8 flex items-center justify-center">
            <Loader2 className="size-4 text-zinc-300 animate-spin" />
          </div>
        ) : mergedKeys.length === 0 ? (
          <div className="border border-zinc-200 rounded-lg p-8 text-center">
            <KeyRound className="size-6 text-zinc-200 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">No API keys yet</p>
            <p className="text-zinc-300 text-xs mt-1">
              Create one above to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {mergedKeys.map((k) => {
              const isActive = !!k.rawKey && k.rawKey === activeKey;
              const canActivate = !!k.rawKey;

              return (
                <div
                  key={k.id}
                  role={canActivate ? 'button' : undefined}
                  tabIndex={canActivate ? 0 : undefined}
                  onClick={() => canActivate && handleToggle(k.rawKey!)}
                  onKeyDown={(e) =>
                    canActivate &&
                    (e.key === 'Enter' || e.key === ' ') &&
                    handleToggle(k.rawKey!)
                  }
                  className={cn(
                    'border rounded-lg px-4 py-3 flex items-center gap-3 transition-colors',
                    isActive
                      ? 'border-emerald-200 bg-emerald-50'
                      : canActivate
                        ? 'border-zinc-200 hover:border-zinc-300 cursor-pointer'
                        : 'border-zinc-100 opacity-60'
                  )}
                >
                  <span
                    className={cn(
                      'size-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                      isActive
                        ? 'border-emerald-500'
                        : canActivate
                          ? 'border-zinc-300'
                          : 'border-zinc-200'
                    )}
                  >
                    {isActive && (
                      <span className="size-2 rounded-full bg-emerald-500" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-medium truncate',
                        isActive ? 'text-emerald-800' : 'text-zinc-800'
                      )}
                    >
                      {k.label}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={cn(
                          'text-xs font-mono',
                          isActive ? 'text-emerald-600' : 'text-zinc-400'
                        )}
                      >
                        mety_live_{k.publicKey}_••••
                      </span>
                      <span className="text-zinc-200">·</span>
                      <span className="text-xs text-zinc-400">
                        {new Date(k.createdAt).toLocaleDateString()}
                      </span>
                      {!canActivate && (
                        <>
                          <span className="text-zinc-200">·</span>
                          <span className="text-xs text-zinc-300 italic">
                            no local key
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(k.id);
                    }}
                    className="text-zinc-300 hover:text-red-400 transition-colors p-1.5"
                    aria-label={`Delete ${k.label}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeKey && !activeKeyInList && (
        <div className="mt-6 flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-medium text-zinc-700">
              Manual key active
            </span>
            <span className="text-xs font-mono text-zinc-400">
              {activeKey.slice(0, 24)}••••
            </span>
          </div>
          <button
            onClick={onDeactivateKey}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
          >
            Deactivate
          </button>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-zinc-100">
        {showManual ? (
          <div>
            <h3 className="text-sm font-medium text-zinc-900 mb-2">
              Enter Existing Key
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  manualKey.trim() &&
                  onActivateKey(manualKey.trim())
                }
                placeholder="mety_live_..."
                className="flex-1 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 font-mono placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 bg-white"
              />
              <button
                onClick={() =>
                  manualKey.trim() && onActivateKey(manualKey.trim())
                }
                disabled={!manualKey.trim()}
                className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              >
                Connect
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowManual(true)}
            className="text-zinc-400 hover:text-zinc-600 text-sm transition-colors"
          >
            Have a key from elsewhere? Enter it manually →
          </button>
        )}
      </div>
    </div>
  );
}
