import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileText, ShieldCheck, CheckCircle2, Lock, Wallet, X
} from 'lucide-react';
import type { Paper } from '../types';
import { MOCK_PAPERS } from '../constants';

interface SubmitPageProps {
  onComplete: (p: Paper) => void;
}

type ReviewMode = 'Open' | 'Blind';

export function SubmitPage({ onComplete }: SubmitPageProps) {
  const [step, setStep]                   = useState(1);
  const [isUploading, setIsUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [reviewMode, setReviewMode]       = useState<ReviewMode>('Open');
  const [isSuccess, setIsSuccess]         = useState(false);

  const handleUpload = () => {
    setIsUploading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => { setIsUploading(false); setStep(2); }, 500);
      }
    }, 200);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => { setIsSubmitting(false); setIsSuccess(true); }, 2500);
  };

  if (isSuccess) {
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
            Your research has been permanently etched onto the Cardano blockchain. Reviewers can now stake ADA to validate your findings.
          </p>
          <div className="bg-zinc-50 rounded-xl p-6 mb-8 text-left space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400 font-bold uppercase tracking-widest">Transaction Hash</span>
              <span className="font-mono text-[color:var(--color-primary)] select-all">d5f8...e2a9</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400 font-bold uppercase tracking-widest">IPFS Content ID</span>
              <span className="font-mono text-zinc-600 select-all">QmXoyp...5n2K</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onComplete(MOCK_PAPERS[0])}
              className="w-full py-4 bg-[color:var(--color-primary)] text-white font-bold rounded-xl hover:bg-[color:var(--color-primary-light)] transition-all shadow-lg"
            >
              View Published Paper
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 text-zinc-500 font-semibold text-sm hover:text-zinc-800 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 max-w-4xl mx-auto px-6">
      <div className="mb-12">
        <h1 className="text-3xl font-bold mb-2">Publish Research</h1>
        <p className="text-zinc-500">Secure your academic legacy on-chain in three simple steps.</p>
      </div>

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
              className="flex-1 flex flex-col"
            >
              {!isUploading ? (
                <div
                  onClick={handleUpload}
                  className="flex-1 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center bg-zinc-50/50 hover:bg-zinc-50 hover:border-[color:var(--color-primary)]/50 transition-all cursor-pointer group"
                >
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform border border-zinc-100">
                    <Upload className="w-8 h-8 text-[color:var(--color-primary)]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Drag & Drop Research PDF</h3>
                  <p className="text-sm text-zinc-400 max-w-xs text-center leading-relaxed">
                    Once uploaded, we will generate a cryptographic fingerprint (SHA-256) for IPFS addressing.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-full max-w-md space-y-6">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">Generating IPFS Hash...</h3>
                        <p className="text-xs text-zinc-400 font-mono italic">Content: research_framework_v1.pdf</p>
                      </div>
                      <span className="text-sm font-bold text-[color:var(--color-primary)]">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[color:var(--color-primary)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <FormField label="Research Title">
                    <input type="text" placeholder="e.g., A Formal Model for Evolving UTXO Ledger State" className="form-input" />
                  </FormField>
                  <FormField label="Abstract Snippet">
                    <textarea rows={5} placeholder="Briefly describe your methodology and conclusions..." className="form-input resize-none" />
                  </FormField>
                </div>
                <div className="space-y-6">
                  <FormField label="Field of Study">
                    <select className="form-input appearance-none cursor-pointer">
                      <option>Distributed Systems</option>
                      <option>Cryptography</option>
                      <option>Macroeconomics</option>
                      <option>Applied Mathematics</option>
                    </select>
                  </FormField>
                  <FormField label="Review Mode">
                    <div className="flex bg-zinc-100 p-1 rounded-xl">
                      {(['Open', 'Blind'] as ReviewMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setReviewMode(mode)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            reviewMode === mode ? 'bg-white text-[color:var(--color-primary)] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                          }`}
                        >
                          {mode === 'Open' ? 'Open Review' : 'Double-Blind'}
                        </button>
                      ))}
                    </div>
                  </FormField>
                  <FormField label="Keywords">
                    <div className="flex flex-wrap gap-2 p-2 border border-[color:var(--color-border)] rounded-xl bg-zinc-50">
                      {['Cardano', 'Haskell', 'UTXO'].map((t) => (
                        <span key={t} className="px-2 py-1 bg-white border border-[color:var(--color-border)] rounded text-[10px] font-bold text-zinc-600 flex items-center gap-1">
                          {t} <X className="w-3 h-3 text-zinc-300" />
                        </span>
                      ))}
                      <input type="text" className="bg-transparent border-none focus:ring-0 text-xs flex-1 min-w-[50px]" placeholder="Add..." />
                    </div>
                  </FormField>
                </div>
              </div>
              <div className="flex justify-between items-center pt-8 border-t border-zinc-50">
                <button onClick={() => setStep(1)} className="text-sm font-semibold text-zinc-400 hover:text-zinc-600">
                  Back to Upload
                </button>
                <div className="flex gap-4">
                  <button className="px-6 py-2.5 text-zinc-400 font-semibold text-sm">Save Draft</button>
                  <button
                    onClick={() => setStep(3)}
                    className="px-8 py-2.5 bg-[color:var(--color-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[color:var(--color-primary-light)] transition-all shadow-md"
                  >
                    Continue to Protocols
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Protocols */}
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
                    <MetaRow label="Verification Status" value={<span className="text-xs font-semibold text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 px-2 py-0.5 rounded uppercase">Ready to sign</span>} />
                    <MetaRow label="Est. Gas (Lovelace)" value="1,842,000 (~1.84 ADA)" mono />
                    <MetaRow label="Min. Review Stake"   value="50 ADA" />
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-[color:var(--color-primary)]/5 rounded-xl border border-[color:var(--color-primary)]/10">
                    <ShieldCheck className="w-5 h-5 text-[color:var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[color:var(--color-primary)]/80 leading-relaxed">
                      By submitting, you agree to stake <strong>10 ADA</strong> as an authenticity bond. This is returned after the first three peer reviews are completed.
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-zinc-900">Protocol Configuration</h3>
                  <div className="space-y-4">
                    <ProtocolOption
                      title="Auto-Incentivize Reviews"
                      desc="Allocate 500 peerA from personal balance to the reward pool."
                    />
                    <ProtocolOption
                      title="Enable Dispute Window"
                      desc="Allow 7 days for community audit before permanent archival."
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-8 border-t border-zinc-50">
                <button onClick={() => setStep(2)} className="text-sm font-semibold text-zinc-400 hover:text-zinc-600">
                  Edit Metadata
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`px-12 py-3 bg-[color:var(--color-primary)] text-white font-bold rounded-xl hover:bg-[color:var(--color-primary-light)] transition-all shadow-lg flex items-center justify-center gap-3 min-w-[200px] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing...
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
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[color:var(--color-surface)] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-8 h-8 text-zinc-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold mb-2">Wallet Signature Required</h3>
            <p className="text-sm text-zinc-500 mb-8">
              Please approve the metadata minting transaction in your connected Cardano wallet extension.
            </p>
            <div className="flex items-center justify-center gap-4 animate-bounce">
              <div className="w-2 h-2 rounded-full bg-[color:var(--color-primary)]" />
              <div className="w-2 h-2 rounded-full bg-[color:var(--color-primary)]/60" />
              <div className="w-2 h-2 rounded-full bg-[color:var(--color-primary)]/30" />
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

function MetaRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
      {typeof value === 'string' ? (
        <span className={`text-sm font-bold text-zinc-700 ${mono ? 'font-mono' : ''}`}>{value}</span>
      ) : value}
    </div>
  );
}

function ProtocolOption({ title, desc }: { title: string; desc: string }) {
  return (
    <label className="flex items-center gap-4 p-4 border border-[color:var(--color-border)] rounded-2xl hover:bg-zinc-50 cursor-pointer transition-all">
      <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-zinc-300 text-[color:var(--color-primary)] focus:ring-[color:var(--color-primary)]" />
      <div className="space-y-1">
        <div className="text-sm font-bold text-zinc-800">{title}</div>
        <div className="text-[11px] text-zinc-400 leading-tight">{desc}</div>
      </div>
    </label>
  );
}
