import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileText, ShieldCheck, CheckCircle2, Lock, Wallet, X, AlertCircle
} from 'lucide-react';
import { useSubmitPaper } from '@/hooks/useSubmitPaper';
import { useWalletInfo } from '@/hooks/useBlockfrost';
import type { ReviewMode } from '@/types';

const MAX_FILE_MB = 50;
const REQUIRED_NETWORK = 'preprod';
const MIN_BALANCE_LOVELACE = 3_000_000n;

interface SubmitPageProps {
  onComplete: () => void;
  connected: boolean;
  address: string | null;
  walletName: string | null;
  networkId: number | null;
}

export function SubmitPage({ onComplete, connected, address, walletName, networkId }: SubmitPageProps) {
  const { data: walletInfo, loading: walletInfoLoading, error: walletInfoError } = useWalletInfo(address);

  const { state, progress, error: submitError, cid, txHash, submit, reset } = useSubmitPaper(walletName);

  const [step, setStep]             = useState(1);
  const [file, setFile]             = useState<File | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const [fileError, setFileError]   = useState<string | null>(null);
  const [title, setTitle]           = useState('');
  const [abstract, setAbstract]     = useState('');
  const [reviewMode, setReviewMode] = useState<ReviewMode>('Open');
  const [tags, setTags]             = useState<string[]>([]);
  const [tagInput, setTagInput]     = useState('');
  const [authors, setAuthors]       = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived wallet/network state (must be declared before any function that uses them) ──

  const walletNetwork = walletInfo?.network ?? null;
  const isWrongWalletNetwork =
    networkId === 1 || (walletNetwork !== null && walletNetwork !== REQUIRED_NETWORK);
  const hasWalletInfo = !!walletInfo && !walletInfoError;
  const availableLovelace = hasWalletInfo && walletInfo.balance?.lovelace
    ? BigInt(walletInfo.balance.lovelace)
    : 0n;
  const hasMinimumBalance = availableLovelace >= MIN_BALANCE_LOVELACE;
  const hasWalletChecks =
    connected && !walletInfoLoading && hasWalletInfo && !isWrongWalletNetwork && hasMinimumBalance;
  const isSubmissionAllowed = hasWalletChecks && !!file;

  const uploadLockedReason =
    !connected
      ? 'Connect Wallet to Upload'
      : walletInfoLoading
      ? 'Checking wallet status...'
      : walletInfoError
      ? `Unable to read wallet balance: ${walletInfoError}`
      : isWrongWalletNetwork
      ? 'Switch wallet/backend to Cardano preprod'
      : !hasMinimumBalance
      ? 'Insufficient tADA balance'
      : null;

  // Seed authors from connected wallet when first entering step 2
  const initAuthors = useCallback(() => {
    if (address && authors.length === 0) setAuthors([address]);
  }, [address, authors.length]);

  // ── File handling ────────────────────────────────────────────────────────────

  async function validateAndSetFile(f: File) {
    setFileError(null);
    if (!connected) {
      setFileError('Connect your Cardano wallet before uploading.');
      return;
    }
    if (isWrongWalletNetwork) {
      setFileError('Wallet is on wrong network. Switch to Cardano preprod before uploading.');
      return;
    }
    if (!hasMinimumBalance) {
      setFileError('Insufficient tADA balance for upload + transaction fees.');
      return;
    }
    if (!f.type.includes('pdf')) {
      setFileError('Only PDF files are accepted.');
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`File exceeds ${MAX_FILE_MB} MB limit.`);
      return;
    }

    const firstBytes = new Uint8Array(await f.slice(0, 5).arrayBuffer());
    const pdfHeader = Array.from(firstBytes).map((b) => String.fromCharCode(b)).join('');
    if (pdfHeader !== '%PDF-') {
      setFileError('Invalid PDF signature. The file content does not match a real PDF.');
      return;
    }

    const inspectionChunk = await f.slice(0, Math.min(f.size, 1_000_000)).text();
    if (/\/Encrypt\b/.test(inspectionChunk)) {
      setFileError('Password-protected/encrypted PDFs are not allowed.');
      return;
    }

    setFile(f);
    setStep(2);
    initAuthors();
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) await validateAndSetFile(f);
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (uploadLockedReason) {
      setFileError(uploadLockedReason);
      return;
    }
    const f = e.dataTransfer.files[0];
    if (f) await validateAndSetFile(f);
  }

  // ── Tags ─────────────────────────────────────────────────────────────────────

  function addTag(raw: string) {
    const tag = raw.trim();
    if (tag && !tags.includes(tag)) setTags(t => [...t, tag]);
    setTagInput('');
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(t => t.slice(0, -1));
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!file || !connected || !address || !isSubmissionAllowed) return;
    void submit(
      {
        file,
        title,
        abstract,
        authors: authors.length > 0 ? authors : [address],
        tags,
        reviewMode,
      },
      address
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────────

  if (state === 'done') {
    return (
      <div className="pt-24 pb-20 max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-3xl p-12 shadow-xl"
        >
          <div className="w-20 h-20 bg-[color:var(--color-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-[color:var(--color-primary)]/20">
            <CheckCircle2 className="w-10 h-10 text-[color:var(--color-primary)]" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Submission Successful</h1>
          <p className="text-zinc-500 mb-8 leading-relaxed">
            Your paper is pinned to IPFS and the anchoring transaction is being confirmed on Cardano.
            It will appear in Discover once it reaches 3 block confirmations.
          </p>
          <div className="bg-zinc-50 rounded-xl p-6 mb-8 text-left space-y-3">
            {txHash && (
              <div className="flex justify-between text-xs gap-4">
                <span className="text-zinc-400 font-bold uppercase tracking-widest shrink-0">Transaction Hash</span>
                <span className="font-mono text-[color:var(--color-primary)] select-all break-all">{txHash}</span>
              </div>
            )}
            {cid && (
              <div className="flex justify-between text-xs gap-4">
                <span className="text-zinc-400 font-bold uppercase tracking-widest shrink-0">IPFS Content ID</span>
                <span className="font-mono text-zinc-600 select-all break-all">{cid}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={onComplete}
              className="w-full py-4 bg-[color:var(--color-primary)] text-white font-bold rounded-xl hover:bg-[color:var(--color-primary-light)] transition-all shadow-lg"
            >
              Back to Discover
            </button>
            <button
              onClick={() => { reset(); setStep(1); setFile(null); setTitle(''); setAbstract(''); setTags([]); setAuthors([]); }}
              className="w-full py-4 text-zinc-500 font-semibold text-sm hover:text-zinc-800 transition-colors"
            >
              Submit Another Paper
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const isSubmitting = state !== 'idle' && state !== 'error';

  const statusStages = [
    { key: 'pinned',    label: 'IPFS Pinned',     done: ['awaitingTxSign', 'broadcasting', 'confirming', 'done'].includes(state) },
    { key: 'submitted', label: 'Tx Submitted',     done: ['confirming', 'done'].includes(state) },
    { key: 'confirmed', label: '3 Confirmations',  done: state === 'confirming' },
  ];

  return (
    <div className="pt-24 pb-20 max-w-4xl mx-auto px-6">
      <div className="mb-12">
        <h1 className="text-3xl font-bold mb-2">Publish Research</h1>
        <p className="text-zinc-500">Secure your academic legacy on-chain in three simple steps.</p>
      </div>

      {/* Wallet warning */}
      {!connected && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-medium">
          <Wallet className="w-5 h-5 shrink-0" />
          Connect a Cardano wallet before submitting.
        </div>
      )}
      {connected && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className={`px-4 py-3 rounded-xl border ${isWrongWalletNetwork ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            Network: {walletInfoLoading ? 'Checking...' : isWrongWalletNetwork ? `Wrong (${walletNetwork ?? 'unknown'})` : 'preprod'}
            <div className="mt-1 text-[10px] opacity-80">
              Backend active: {walletInfoLoading ? 'checking...' : walletNetwork ?? 'unknown'}
            </div>
          </div>
          <div className={`px-4 py-3 rounded-xl border ${hasMinimumBalance ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            tADA balance check: {walletInfoLoading ? 'Checking...' : walletInfoError ? 'Unable to load balance' : hasMinimumBalance ? 'Ready for fees' : 'Need at least 3 tADA'}
          </div>
        </div>
      )}

      {/* Step indicators */}
      <div className="flex items-center gap-4 mb-12">
        {[
          { icon: Upload,      label: 'Upload' },
          { icon: FileText,    label: 'Metadata' },
          { icon: ShieldCheck, label: 'Protocols' },
        ].map((s, i) => (
          <div key={s.label} className="flex items-center gap-4 flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
              step > i + 1
                ? 'bg-[color:var(--color-primary)] border-[color:var(--color-primary)] text-white shadow-md'
                : step === i + 1
                ? 'border-[color:var(--color-primary)] text-[color:var(--color-primary)] shadow-sm ring-4 ring-[color:var(--color-primary)]/5'
                : 'border-zinc-200 text-zinc-300'
            }`}>
              {step > i + 1 ? <CheckCircle2 className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-[0.15em] ${step >= i + 1 ? 'text-zinc-900' : 'text-zinc-300'}`}>
              {s.label}
            </div>
            {i < 2 && <div className="flex-1 h-px bg-zinc-100" />}
          </div>
        ))}
      </div>

      {/* Step card */}
      <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-3xl p-10 card-shadow min-h-[480px] flex flex-col">
        <AnimatePresence mode="wait">

          {/* Step 1: Upload */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-4"
            >
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); if (!uploadLockedReason) setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => { if (!uploadLockedReason) fileInputRef.current?.click(); }}
                className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-zinc-50/50 hover:bg-zinc-50 transition-all cursor-pointer group
                  ${uploadLockedReason ? 'opacity-70 cursor-not-allowed' : ''}
                  ${dragOver ? 'border-[color:var(--color-primary)] bg-zinc-50' : 'border-zinc-200 hover:border-[color:var(--color-primary)]/50'}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={!!uploadLockedReason}
                />
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform border border-zinc-100">
                  <Upload className="w-8 h-8 text-[color:var(--color-primary)]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{uploadLockedReason ?? 'Drag & Drop Research PDF'}</h3>
                <p className="text-sm text-zinc-400 max-w-xs text-center leading-relaxed">
                  Max {MAX_FILE_MB} MB · PDF signature verified · encrypted PDFs blocked before upload.
                </p>
              </div>

              {fileError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {fileError}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Metadata */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {file && (
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 border border-[color:var(--color-border)] rounded-xl text-sm text-zinc-600">
                  <FileText className="w-4 h-4 text-[color:var(--color-primary)] shrink-0" />
                  <span className="font-medium truncate">{file.name}</span>
                  <span className="text-zinc-400 shrink-0">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <FormField label="Research Title">
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g., A Formal Model for Evolving UTXO Ledger State"
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="Abstract">
                    <textarea
                      rows={5}
                      value={abstract}
                      onChange={e => setAbstract(e.target.value)}
                      placeholder="Briefly describe your methodology and conclusions…"
                      className="form-input resize-none"
                    />
                  </FormField>
                </div>
                <div className="space-y-6">
                  <FormField label="Review Mode">
                    <div className="flex bg-zinc-100 p-1 rounded-xl">
                      {(['Open', 'Blind'] as ReviewMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setReviewMode(mode)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            reviewMode === mode
                              ? 'bg-white text-[color:var(--color-primary)] shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-700'
                          }`}
                        >
                          {mode === 'Open' ? 'Open Review' : 'Double-Blind'}
                        </button>
                      ))}
                    </div>
                  </FormField>

                  <FormField label="Keywords">
                    <div className="flex flex-wrap gap-2 p-2 border border-[color:var(--color-border)] rounded-xl bg-zinc-50 min-h-[44px]">
                      {tags.map(t => (
                        <span key={t} className="px-2 py-1 bg-white border border-[color:var(--color-border)] rounded text-[10px] font-bold text-zinc-600 flex items-center gap-1">
                          {t}
                          <button type="button" onClick={() => setTags(ts => ts.filter(x => x !== t))}>
                            <X className="w-3 h-3 text-zinc-300 hover:text-zinc-500" />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                        className="bg-transparent border-none focus:ring-0 text-xs flex-1 min-w-[60px] outline-none"
                        placeholder={tags.length === 0 ? 'Add keywords… (Enter to add)' : 'Add…'}
                      />
                    </div>
                  </FormField>

                  <FormField label="Authors (wallet addresses)">
                    <div className="flex flex-col gap-2">
                      {authors.map((addr, i) => (
                        <div key={addr} className="flex items-center gap-2">
                          <span className="flex-1 font-mono text-[10px] text-zinc-600 bg-zinc-50 border border-[color:var(--color-border)] rounded-lg px-3 py-2 truncate">
                            {addr}
                          </span>
                          {i > 0 && (
                            <button type="button" onClick={() => setAuthors(a => a.filter(x => x !== addr))}>
                              <X className="w-4 h-4 text-zinc-300 hover:text-zinc-500" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </FormField>
                </div>
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-zinc-50">
                <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-zinc-400 hover:text-zinc-600">
                  Back to Upload
                </button>
                <button
                  type="button"
                  disabled={!title || !abstract || !hasWalletChecks}
                  onClick={() => setStep(3)}
                  className="px-8 py-2.5 bg-[color:var(--color-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[color:var(--color-primary-light)] transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue to Protocols
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Protocols / Submit */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-zinc-900">Pre-Publishing Review</h3>
                  <div className="bg-zinc-50 border border-[color:var(--color-border)] rounded-2xl p-6 space-y-4">
                    <MetaRow label="Paper" value={file?.name ?? '—'} />
                    <MetaRow label="Title" value={title || '—'} />
                    <MetaRow label="Review Mode" value={reviewMode} />
                    <MetaRow label="Keywords" value={tags.join(', ') || '—'} />
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-[color:var(--color-primary)]/5 rounded-xl border border-[color:var(--color-primary)]/10">
                    <ShieldCheck className="w-5 h-5 text-[color:var(--color-primary)] shrink-0 mt-0.5" />
                    <p className="text-xs text-[color:var(--color-primary)]/80 leading-relaxed">
                      Submission pins your paper to IPFS and anchors the CID on Cardano preprod via a metadata transaction.
                      Your wallet will be prompted twice: once to authenticate, once to sign the anchoring transaction.
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-zinc-900">Submission Status</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {statusStages.map((stage) => (
                      <div
                        key={stage.key}
                        className={`text-[10px] text-center px-2 py-2 rounded-lg border font-semibold ${
                          stage.done
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                        }`}
                      >
                        {stage.label}
                      </div>
                    ))}
                  </div>
                  <div className="bg-zinc-50 border border-[color:var(--color-border)] rounded-2xl p-6 min-h-[100px] flex items-center justify-center">
                    {state === 'idle' && (
                      <p className="text-sm text-zinc-400 text-center">Ready to submit. Click the button below when you're ready.</p>
                    )}
                    {state === 'error' && submitError && (
                      <div className="flex items-start gap-3 text-red-600">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm">{submitError}</p>
                      </div>
                    )}
                    {isSubmitting && (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-8 h-8 border-2 border-[color:var(--color-primary)]/30 border-t-[color:var(--color-primary)] rounded-full animate-spin" />
                        <p className="text-sm text-zinc-600">{progress}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-zinc-50">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="text-sm font-semibold text-zinc-400 hover:text-zinc-600 disabled:opacity-40"
                >
                  Edit Metadata
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isSubmissionAllowed}
                  className={`px-12 py-3 bg-[color:var(--color-primary)] text-white font-bold rounded-xl hover:bg-[color:var(--color-primary-light)] transition-all shadow-lg flex items-center justify-center gap-3 min-w-[200px] ${
                    isSubmitting || !isSubmissionAllowed ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {state === 'awaitingMetadataSign' || state === 'awaitingTxSign' ? 'Waiting for wallet…' : 'Processing…'}
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Submit to Cardano
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Wallet signing overlay */}
      {(state === 'awaitingMetadataSign' || state === 'awaitingTxSign') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[color:var(--color-surface)] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-8 h-8 text-zinc-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {state === 'awaitingMetadataSign' ? 'Signature Required' : 'Transaction Signature Required'}
            </h3>
            <p className="text-sm text-zinc-500 mb-8">
              {state === 'awaitingMetadataSign'
                ? 'Please approve the authentication signature in your connected Cardano wallet.'
                : 'Please approve the metadata anchoring transaction in your connected Cardano wallet.'}
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="w-2 h-2 rounded-full bg-[color:var(--color-primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-[color:var(--color-primary)]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-[color:var(--color-primary)]/30 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Helper sub-components

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest shrink-0">{label}</span>
      <span className="text-xs text-zinc-700 text-right break-all">{value}</span>
    </div>
  );
}