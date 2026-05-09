import { useEffect, useState, type ElementType } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award, ShieldCheck, Gift, AlertCircle,
  MessageSquare, Gavel, RotateCcw, CheckCircle, XCircle, Info
} from 'lucide-react';
import type { Paper, Review } from '../types';

interface PaperDetailPageProps {
  paper: Paper;
  reviews: Review[];
  connected: boolean;
  walletAddress: string | null;
  walletName: string | null;
  retryingAnchor: boolean;
  onRetryAnchor: () => void;
}

// ─── Toast notification ───────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  variant: ToastVariant;
  title: string;
  body?: string;
}

function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = globalThis.setTimeout(() => onDismiss(toast.id), 6000);
    return () => globalThis.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const Icon = toast.variant === 'success' ? CheckCircle : toast.variant === 'error' ? XCircle : Info;
  const colours = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  } satisfies Record<ToastVariant, string>;
  const iconColours = {
    success: 'text-emerald-500',
    error:   'text-red-500',
    info:    'text-blue-500',
  } satisfies Record<ToastVariant, string>;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={`flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border px-4 py-3 shadow-lg ${colours[toast.variant]}`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColours[toast.variant]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{toast.title}</p>
        {toast.body && (
          <p className="text-xs mt-0.5 font-mono break-all opacity-80">{toast.body}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-current opacity-40 hover:opacity-80 transition-opacity text-lg leading-none mt-[-2px]"
        aria-label="Dismiss"
      >
        ×
      </button>
    </motion.div>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Abstract', 'Full Paper', 'Reviews', 'Disputes', 'History'];
const CONFIRMATION_LABELS: Record<NonNullable<Paper['confirmationStatus']>, string> = {
  pending_anchor: 'Awaiting Anchor',
  pending_confirmation: 'Confirming',
  confirmed: 'Confirmed',
  confirmation_timeout: 'Confirmation Timeout',
};
const MINT_LABELS: Record<NonNullable<Paper['mintStatus']>, string> = {
  eligible: 'Mint Eligible',
  minted: 'Minted',
  failed: 'Mint Failed',
};
const IPFS_GATEWAY_URL = import.meta.env.VITE_IPFS_GATEWAY_URL ?? 'https://ipfs.io/ipfs';

// ─── Main component ───────────────────────────────────────────────────────────

export function PaperDetailPage({ paper, reviews, connected, walletAddress, walletName, retryingAnchor, onRetryAnchor }: PaperDetailPageProps) {
  const [activeTab, setActiveTab] = useState('Abstract');
  const [showViewedPulse, setShowViewedPulse] = useState(true);
  const [paperReviews, setPaperReviews] = useState<Review[]>(reviews.filter((r) => r.paperId === paper.id));
  const [reviewDraft, setReviewDraft] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(4);
  const [reviewStakeAmount, setReviewStakeAmount] = useState<number>(paper.stakeRequired ?? 100);
  const [reviewSigning, setReviewSigning] = useState(false);
  const [claimingMint, setClaimingMint] = useState(false);
  const [localMintStatus, setLocalMintStatus] = useState<Paper['mintStatus']>(paper.mintStatus);
  const [localMintAmount, setLocalMintAmount] = useState<number | null>(paper.mintAmount ?? null);
  const [reviewVotes, setReviewVotes] = useState<Record<string, 'up' | 'down' | null>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const primaryAuthor = paper.authors[0];
  const canRetryAnchor = connected && walletAddress === primaryAuthor?.address && walletName !== null;

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  useEffect(() => {
    setLocalMintStatus(paper.mintStatus);
    setLocalMintAmount(paper.mintAmount ?? null);
    setReviewStakeAmount(paper.stakeRequired ?? 100);
  }, [paper.mintStatus, paper.mintAmount, paper.stakeRequired]);

  const isReviewOpen = paper.status === 'Under Review' || paper.status === 'Awaiting Review';
  const canSubmitReview = connected && isReviewOpen;

  async function handleSubmitReview() {
    if (!canSubmitReview || !walletAddress || !walletName) {
      setReviewError('Connect a wallet and select a review opportunity before submitting.');
      return;
    }

    if (reviewDraft.trim().length < 40) {
      setReviewError('Please provide at least 40 characters for a meaningful review.');
      return;
    }

    setReviewSigning(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 750));
      setPaperReviews((current) => [
        {
          id: `review-${Date.now()}`,
          paperId: paper.id,
          reviewerAddress: walletAddress,
          content: reviewDraft.trim(),
          rating: reviewRating,
          stakeAmount: reviewStakeAmount,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
        },
        ...current,
      ]);
      setReviewDraft('');
      setReviewError(null);
      setShowReviewModal(false);
      setToasts((prev) => [
        {
          id: Date.now(),
          variant: 'success',
          title: 'Review submitted',
          body: 'Your peer review has been recorded locally and will sync after backend support is available.',
        },
        ...prev,
      ]);
    } finally {
      setReviewSigning(false);
    }
  }

  function handleVoteReview(reviewId: string, vote: 'up' | 'down') {
    setReviewVotes((current) => ({
      ...current,
      [reviewId]: current[reviewId] === vote ? null : vote,
    }));
    setToasts((prev) => [
      {
        id: Date.now(),
        variant: 'info',
        title: vote === 'up' ? 'Review upvoted' : 'Review downvoted',
      },
      ...prev,
    ]);
  }

  async function handleClaimMint() {
    if (localMintStatus !== 'eligible') {
      setToasts((prev) => [
        {
          id: Date.now(),
          variant: 'error',
          title: 'Mint not eligible',
          body: 'This paper is not currently eligible for mint rewards.',
        },
        ...prev,
      ]);
      return;
    }

    setClaimingMint(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setLocalMintStatus('minted');
      setToasts((prev) => [
        {
          id: Date.now(),
          variant: 'success',
          title: 'Mint claimed',
          body: `You claimed ${localMintAmount ?? 0} peerA for this paper.`,
        },
        ...prev,
      ]);
    } finally {
      setClaimingMint(false);
    }
  }


  // ── Retry anchor ───────────────────────────────────────────────────────────
  // Logic lives in PaperDetailRoute so state survives navigation.

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    setPaperReviews(reviews.filter((r) => r.paperId === paper.id));
    setReviewDraft('');
    setReviewError(null);
    setShowReviewModal(false);
  }, [paper.id, reviews]);

  useEffect(() => {
    setShowViewedPulse(true);
    const timeout = globalThis.setTimeout(() => setShowViewedPulse(false), 2200);
    return () => globalThis.clearTimeout(timeout);
  }, [paper.id]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="pt-24 pb-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Main content */}
          <div className="lg:col-span-3">
            {/* Header */}
            <div className="mb-12">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-xs font-mono text-zinc-400 bg-zinc-100 rounded px-2 py-1">
                  IPFS: {paper.ipfsHash}
                </span>

                {paper.confirmationStatus && (
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-1 border ${
                      paper.confirmationStatus === 'confirmed'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : paper.confirmationStatus === 'confirmation_timeout'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    {CONFIRMATION_LABELS[paper.confirmationStatus]}
                  </span>
                )}

                {/* Retry button — clean, no inline status text */}
                {paper.confirmationStatus === 'pending_anchor' && canRetryAnchor && (
                  <button
                    type="button"
                    onClick={onRetryAnchor}
                    disabled={retryingAnchor}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Retry anchoring transaction"
                  >
                    <RotateCcw className={`w-3 h-3 ${retryingAnchor ? 'animate-spin' : ''}`} />
                    {retryingAnchor ? 'Retrying…' : 'Retry'}
                  </button>
                )}

                {paper.reviewMode && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-1 border bg-slate-50 border-slate-200 text-slate-700">
                    {paper.reviewMode} Review
                  </span>
                )}

                {paper.mintStatus && (
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-1 border ${
                      paper.mintStatus === 'minted'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : paper.mintStatus === 'failed'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    {MINT_LABELS[paper.mintStatus]}
                  </span>
                )}

                <span className="text-xs text-zinc-400 italic">Submitted {paper.date}</span>
              </div>

              <h1 className="text-4xl font-semibold mb-8 tracking-tight leading-tight">{paper.title}</h1>

              <div className="flex flex-wrap gap-5 items-center">
                {paper.authors.map((author) => (
                  <div key={author.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 border border-[color:var(--color-border)] flex items-center justify-center font-mono text-xs">
                      {(author.address || author.id).slice(0, 4).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {author.address.slice(0, 10)}...
                        {author.badges.includes('Top Reviewer Q1') && (
                          <Award className="w-3.5 h-3.5 text-[color:var(--color-primary)]" />
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                        Reputation {author.reputation}
                      </div>
                    </div>
                  </div>
                ))}
                {paper.authors.length === 0 && (
                  <div className="text-sm text-zinc-500">Unknown author</div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-[color:var(--color-border)] mb-8 overflow-x-auto">
              <div className="flex gap-8">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 text-sm font-semibold relative transition-colors whitespace-nowrap ${
                      activeTab === tab
                        ? 'text-[color:var(--color-primary)]'
                        : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--color-primary)]"
                      />
                    )}
                    {tab === 'Reviews' && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-zinc-100 text-[10px]">
                        {paper.reviewCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === 'Abstract' && (
                <motion.div
                  key="abstract"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="prose prose-zinc max-w-none pt-2"
                >
                  <p className="text-lg leading-relaxed text-zinc-600 mb-8 font-medium italic">
                    "{paper.abstract}"
                  </p>
                  <div className="space-y-6 text-zinc-500 leading-relaxed">
                    <p>
                      Full content preview is not available in this increment. Use the IPFS CID above to retrieve
                      the canonical paper document.
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'Full Paper' && (
                <motion.div
                  key="full-paper"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="text-center py-16 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                    <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-4" />
                    <p className="text-zinc-500 font-medium mb-6">Full paper rendering is not available yet.</p>
                    <a
                      href={`${IPFS_GATEWAY_URL}/${paper.ipfsHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[color:var(--color-primary)] text-white text-sm font-semibold hover:bg-[color:var(--color-primary-light)] transition-colors"
                    >
                      Open Paper on IPFS
                    </a>
                  </div>
                </motion.div>
              )}

              {activeTab === 'Reviews' && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="p-6 border border-[color:var(--color-border)] rounded-3xl bg-[color:var(--color-surface)]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">Stake a peer review</p>
                        <p className="text-sm text-zinc-500 leading-relaxed">
                          {paper.status === 'Under Review' || paper.status === 'Awaiting Review'
                            ? `Lock ${paper.stakeRequired ?? 100} ADA and submit your review to earn up to ${paper.reviewReward ?? 250} peerA.`
                            : 'Reviewing is closed for this submission.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowReviewModal((current) => !current)}
                        disabled={!connected || paper.status === 'Reviewed' || paper.status === 'Disputed'}
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          connected && (paper.status === 'Under Review' || paper.status === 'Awaiting Review')
                            ? 'bg-[color:var(--color-primary)] text-white hover:bg-[color:var(--color-primary-light)]'
                            : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {connected ? (showReviewModal ? 'Hide review form' : 'Write review') : 'Connect wallet to review'}
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm text-zinc-500">
                      <div className="rounded-2xl bg-white border border-[color:var(--color-border)] p-4">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Stake requirement</div>
                        <div className="text-sm font-semibold text-zinc-900">{paper.stakeRequired ?? 100} ADA</div>
                      </div>
                      <div className="rounded-2xl bg-white border border-[color:var(--color-border)] p-4">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Potential reward</div>
                        <div className="text-sm font-semibold text-[color:var(--color-accent)]">
                          {paper.reviewReward ?? 250} peerA
                        </div>
                      </div>
                    </div>
                  </div>

                  {showReviewModal && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40">
                      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white border border-[color:var(--color-border)] shadow-2xl">
                        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[color:var(--color-border)]">
                          <div>
                            <p className="text-lg font-semibold text-zinc-900">Submit your peer review</p>
                            <p className="text-sm text-zinc-500">Your review will be recorded locally until backend review submission support is available.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowReviewModal(false)}
                            className="text-zinc-400 hover:text-zinc-700 transition-colors"
                            aria-label="Close review form"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="space-y-2 text-sm">
                              <span className="font-semibold text-zinc-900">Review rating</span>
                              <select
                                value={reviewRating}
                                onChange={(event) => setReviewRating(Number(event.target.value))}
                                className="w-full rounded-3xl border border-[color:var(--color-border)] px-4 py-3 text-sm"
                              >
                                {[5, 4, 3, 2, 1].map((value) => (
                                  <option key={value} value={value}>
                                    {value} stars
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-2 text-sm">
                              <span className="font-semibold text-zinc-900">Stake amount</span>
                              <input
                                type="number"
                                min={paper.stakeRequired ?? 50}
                                step={5}
                                value={reviewStakeAmount}
                                onChange={(event) => setReviewStakeAmount(Number(event.target.value))}
                                className="w-full rounded-3xl border border-[color:var(--color-border)] px-4 py-3 text-sm"
                              />
                              <p className="text-xs text-zinc-400">Suggested stake: {paper.stakeRequired ?? 100} ADA</p>
                            </label>
                          </div>
                          <label className="block text-sm">
                            <span className="font-semibold text-zinc-900">Review text</span>
                            <textarea
                              rows={7}
                              value={reviewDraft}
                              onChange={(event) => setReviewDraft(event.target.value)}
                              className="mt-2 w-full rounded-3xl border border-[color:var(--color-border)] px-4 py-4 text-sm resize-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20 outline-none"
                              placeholder="Explain the strengths, weaknesses, and correction suggestions for this work..."
                            />
                          </label>
                          {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
                          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                            <div className="text-xs text-zinc-500">
                              Signed by {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : 'unknown wallet'}
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => setShowReviewModal(false)}
                                className="rounded-3xl border border-[color:var(--color-border)] px-5 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleSubmitReview}
                                disabled={reviewSigning}
                                className="rounded-3xl bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[color:var(--color-primary-light)] transition-colors"
                              >
                                {reviewSigning ? 'Signing...' : 'Submit review'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {paperReviews.length > 0 ? (
                    paperReviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-6 border border-[color:var(--color-border)] rounded-2xl bg-[color:var(--color-surface)] relative overflow-hidden"
                      >
                        {review.status === 'slashed' && (
                          <div className="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest">
                            Slashed for Accuracy
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-mono text-[10px]">
                              RV
                            </div>
                            <div>
                              <div className="text-sm font-semibold">{review.reviewerAddress.slice(0, 12)}...</div>
                              <div className="text-[10px] text-zinc-400 font-bold uppercase">
                                Rating {review.rating}/5
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[color:var(--color-accent)] font-bold text-xs">
                            <Gift className="w-3.5 h-3.5" />
                            +{review.rating * 50} peerA
                          </div>
                        </div>
                        <p className="text-sm text-zinc-600 leading-relaxed mb-4">"{review.content}"</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-xs text-zinc-400">
                            {review.date} • {review.status}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleVoteReview(review.id, 'up')}
                              className={`text-xs font-semibold rounded-full px-2.5 py-1 transition-colors ${
                                reviewVotes[review.id] === 'up'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {reviewVotes[review.id] === 'up' ? 'Upvoted' : 'Upvote'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVoteReview(review.id, 'down')}
                              className={`text-xs font-semibold rounded-full px-2.5 py-1 transition-colors ${
                                reviewVotes[review.id] === 'down'
                                  ? 'bg-red-100 text-red-700'
                                  : 'text-zinc-500 hover:text-red-700 hover:bg-red-50'
                              }`}
                            >
                              {reviewVotes[review.id] === 'down' ? 'Downvoted' : 'Downvote'}
                            </button>
                          </div>
                          <button className="text-xs font-semibold text-zinc-400 hover:text-red-500 transition-colors">
                            Report Review
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState icon={MessageSquare} message="Awaiting first peer reviews." />
                  )}
                </motion.div>
              )}

              {activeTab === 'Disputes' && (
                <motion.div
                  key="disputes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <EmptyState icon={Gavel} message="No active disputes on this research." />
                </motion.div>
              )}

              {activeTab === 'History' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <EmptyState icon={Award} message="No version history events found for this paper." />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metrics */}
            <div className="p-6 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-xl card-shadow">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Paper Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Total Citations</span>
                  <span className="text-sm font-semibold">{paper.citations}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Views</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{paper.views}</span>
                    <AnimatePresence>
                      {showViewedPulse && (
                        <motion.span
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.35 }}
                          className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 font-semibold"
                        >
                          Viewed just now
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">peerA Earned</span>
                  <span className="text-sm font-semibold flex items-center gap-1 text-[color:var(--color-accent)]">
                    <Gift className="w-3.5 h-3.5" />
                    {paper.rewardPool / 2}
                  </span>
                </div>
                {localMintStatus && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500">Mint Reward</span>
                      <span className="text-sm font-semibold">
                        {localMintStatus === 'eligible'
                          ? `Eligible${localMintAmount ? ` • ${localMintAmount} peerA` : ''}`
                          : localMintStatus === 'minted'
                          ? `Minted${localMintAmount ? ` • ${localMintAmount} peerA` : ''}`
                          : 'Mint failed'}
                      </span>
                    </div>
                    {localMintStatus === 'eligible' && (
                      <button
                        type="button"
                        onClick={handleClaimMint}
                        disabled={claimingMint}
                        className="w-full rounded-3xl bg-[color:var(--color-accent)] px-4 py-3 text-sm font-semibold text-white hover:bg-[color:var(--color-accent)]/90 transition-colors"
                      >
                        {claimingMint ? 'Claiming…' : `Claim ${localMintAmount ?? 'reward'} peerA`}
                      </button>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Staked ADA</span>
                  <span className="text-sm font-semibold">{primaryAuthor ? '1,250 tADA' : '—'}</span>
                </div>
              </div>
            </div>

            {/* Stake & Review */}
            <div className="p-6 bg-[color:var(--color-primary)]/5 border border-[color:var(--color-primary)]/20 rounded-xl">
              <div className="flex items-center gap-2 mb-4 text-[color:var(--color-primary)]">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Stake & Review</h3>
              </div>
              <p className="text-xs text-[color:var(--color-primary)]/80 mb-6 leading-relaxed">
                Lock stake to join a review and earn peerA rewards. Use this panel to prepare your review stake before submission.
              </p>
              <label className="block text-sm text-zinc-600 mb-4">
                <span className="font-semibold text-zinc-900">Stake amount (ADA)</span>
                <input
                  type="number"
                  min={paper.stakeRequired ?? 50}
                  step={5}
                  value={reviewStakeAmount}
                  onChange={(event) => setReviewStakeAmount(Number(event.target.value))}
                  className="mt-2 w-full rounded-3xl border border-[color:var(--color-border)] px-4 py-3 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setToasts((prev) => [
                    {
                      id: Date.now(),
                      variant: 'info',
                      title: 'Stake prepared',
                      body: `Ready to stake ${reviewStakeAmount} ADA for review submission.`,
                    },
                    ...prev,
                  ]);
                }}
                className="w-full py-2.5 bg-[color:var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[color:var(--color-primary-light)] transition-all shadow-sm"
              >
                Prepare stake
              </button>
              <button
                type="button"
                onClick={() => setShowReviewModal(true)}
                className="w-full mt-3 py-2.5 border border-[color:var(--color-primary)] text-[color:var(--color-primary)] text-sm font-semibold rounded-lg hover:bg-[color:var(--color-primary)]/10 transition-all"
              >
                Review with stake
              </button>
            </div>

            {/* Dispute */}
            <div className="p-6 bg-red-50 border border-red-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold">Dispute Resolution</h3>
              </div>
              <p className="text-xs text-red-600 mb-4 font-medium leading-relaxed">
                Found plagiarism or flawed methodology?
              </p>
              <button className="w-full py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-white transition-all">
                Raise Stake Challenge
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast portal */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

function EmptyState({ icon: Icon, message }: { icon: ElementType; message: string }) {
  return (
    <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
      <Icon className="w-8 h-8 text-zinc-300 mx-auto mb-4" />
      <p className="text-zinc-400 font-medium tracking-tight">{message}</p>
    </div>
  );
}