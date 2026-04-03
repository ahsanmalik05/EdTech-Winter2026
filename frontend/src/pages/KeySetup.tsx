import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  Plus,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  Trash2,
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

function CopyKeyButton({ rawKey, label }: { rawKey: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded transition-colors text-zinc-300 hover:text-zinc-700"
      aria-label={`Copy raw key for ${label}`}
      title="Copy raw key"
    >
      {copied
        ? <Check className="size-3.5" />
        : <Copy className="size-3.5" />}
    </button>
  );
}

export function KeySetup({ onActivateKey, activeKey, onDeactivateKey }: KeySetupProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [storedKeys, setStoredKeysState] = useState<StoredKey[]>(getStoredKeys);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<{ raw: string; label: string } | null>(null);
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
      if (stored?.rawKey === activeKey) onDeactivateKey();
      updateStoredKeys(storedKeys.filter((s) => s.id !== id));
      await api.delete(`/api/keys/${id}`);
      fetchKeys();
    } catch {
      // silent
    }
  };

  const handleToggle = (rawKey: string) => {
    if (rawKey === activeKey) onDeactivateKey();
    else onActivateKey(rawKey);
  };

  return (
    <div className="max-w-2xl mx-auto w-full">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="mb-10 pb-7 border-b border-zinc-100">
        <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-zinc-400 mb-2">
          Configuration
        </p>
        <h2
          className="text-[2rem] leading-tight text-zinc-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          API Keys
        </h2>
        <p className="text-sm text-zinc-400 mt-1.5">
          Manage and activate keys for translation and generation.
        </p>
      </div>

      {/* ── Demo notice ────────────────────────────────── */}
      <div className="mb-8 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5">
        <span className="mt-px text-base leading-none select-none">⚠</span>
        <div>
          <p className="text-xs font-semibold text-amber-800 mb-0.5">Demo mode</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Raw keys are saved in your browser so you can switch between them.
            In the actual Mety Technology app our partner is working on, keys will be shown only once at creation.
          </p>
        </div>
      </div>

      {/* ── Just-created banner ────────────────────────── */}
      {justCreated && (
        <div className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-emerald-100">
            <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-emerald-700">
              Key created — {justCreated.label}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.1em] uppercase text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="px-5 py-3.5">
            <p
              className="text-xs text-emerald-900 break-all select-all leading-relaxed"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {justCreated.raw}
            </p>
          </div>
          <div className="px-5 pb-4">
            {justCreated.raw === activeKey ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check className="size-3" /> Active
              </span>
            ) : (
              <button
                onClick={() => onActivateKey(justCreated.raw)}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                Use this key <ArrowRight className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────── */}
      {error && (
        <div className="mb-6 border-l-2 border-red-400 pl-4">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* ── Create form ────────────────────────────────── */}
      <div className="mb-10">
        <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-zinc-400 mb-3">
          New Key
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' && newLabel.trim() && !creating && handleCreate()
            }
            placeholder="Label — e.g. Production, Development"
            className="flex-1 border border-zinc-200 rounded-md px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-900 bg-white transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={!newLabel.trim() || creating}
            className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-700 disabled:bg-zinc-100 disabled:text-zinc-300 rounded-md px-4 py-2.5 text-sm font-medium transition-colors"
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

      {/* ── Key list ───────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-zinc-400 mb-4">
          Your Keys
          {mergedKeys.length > 0 && (
            <span className="ml-1.5 tabular-nums font-normal">({mergedKeys.length})</span>
          )}
        </p>

        {loadingKeys ? (
          <div className="py-14 flex justify-center">
            <Loader2 className="size-4 text-zinc-300 animate-spin" />
          </div>
        ) : mergedKeys.length === 0 ? (
          <div className="border border-dashed border-zinc-200 rounded-lg py-14 text-center">
            <KeyRound className="size-5 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No API keys yet</p>
            <p className="text-xs text-zinc-300 mt-1">Create one above to get started</p>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-100 overflow-hidden">
            {mergedKeys.map((k, i) => {
              const isActive = !!k.rawKey && k.rawKey === activeKey;
              const canActivate = !!k.rawKey;

              return (
                <div
                  key={k.id}
                  title={!canActivate ? 'Key not available locally — create keys in this session to activate them' : undefined}
                  className={cn(
                    'group flex items-center gap-4 pl-4 pr-5 py-4 transition-colors',
                    i > 0 && 'border-t border-zinc-100',
                    isActive
                      ? 'bg-zinc-50 border-l-[3px] border-l-zinc-700'
                      : 'bg-white border-l-[3px] border-l-transparent hover:bg-zinc-50'
                  )}
                >
                  {/* Selection dot */}
                  <div
                    className={cn(
                      'shrink-0 size-2 rounded-full transition-colors',
                      isActive ? 'bg-zinc-700' : 'bg-zinc-200'
                    )}
                  />

                  {/* Label + key string */}
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium leading-none', isActive ? 'text-zinc-900' : 'text-zinc-900')}>
                      {k.label}
                    </p>
                    <p
                      className={cn('text-xs mt-1.5 leading-none', isActive ? 'text-zinc-500' : 'text-zinc-400')}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      mety_live_{k.publicKey}_•••• · {new Date(k.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Active label */}
                  {isActive && (
                    <span
                      className="text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-700 shrink-0"
                    >
                      Active
                    </span>
                  )}

                  {/* Actions — always visible */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {canActivate && (
                      <button
                        onClick={() => handleToggle(k.rawKey!)}
                        className={cn(
                          'text-[11px] font-medium px-2.5 py-1 rounded transition-colors',
                          isActive
                            ? 'text-zinc-600 hover:text-red-500'
                            : 'text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200'
                        )}
                      >
                        {isActive ? 'Deactivate' : 'Use Key'}
                      </button>
                    )}
                    {canActivate && (
                      <CopyKeyButton rawKey={k.rawKey!} label={k.label} />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(k.id); }}
                      className="p-1.5 rounded transition-colors text-zinc-300 hover:text-red-400"
                      aria-label={`Delete ${k.label}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Manual key active (not in list) ───────────── */}
      {activeKey && !activeKeyInList && (
        <div className="mt-6 flex items-center justify-between border border-zinc-200 rounded-lg px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="size-2 rounded-full bg-zinc-700 shrink-0" />
            <div>
              <p className="text-sm font-medium text-zinc-900 leading-none">Manual key active</p>
              <p
                className="text-xs text-zinc-400 mt-1 leading-none"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {activeKey.slice(0, 24)}••••
              </p>
            </div>
          </div>
          <button
            onClick={onDeactivateKey}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
          >
            Deactivate
          </button>
        </div>
      )}

      {/* ── Manual entry ──────────────────────────────── */}
      <div className="mt-10 pt-6 border-t border-zinc-100">
        {showManual ? (
          <div>
            <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-zinc-400 mb-3">
              Enter Existing Key
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && manualKey.trim() && onActivateKey(manualKey.trim())
                }
                placeholder="mety_live_..."
                className="flex-1 border border-zinc-200 rounded-md px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-900 bg-white transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <button
                onClick={() => manualKey.trim() && onActivateKey(manualKey.trim())}
                disabled={!manualKey.trim()}
                className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-700 disabled:bg-zinc-100 disabled:text-zinc-300 rounded-md px-4 py-2.5 text-sm font-medium transition-colors"
              >
                Connect
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowManual(true)}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Have a key from elsewhere? Enter it manually →
          </button>
        )}
      </div>
    </div>
  );
}

