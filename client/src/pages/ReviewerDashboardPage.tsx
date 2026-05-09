import { useState } from 'react';
import { ShieldCheck, Sparkles, BookOpen, Info } from 'lucide-react';
import type { Paper } from '../types';

interface ReviewerDashboardPageProps {
  papers: Paper[];
  onSelectPaper: (paper: Paper) => void;
}

const STATUS_LABELS: Record<Paper['status'], string> = {
  Reviewed: 'Peer Reviewed',
  'Under Review': 'Under Review',
  Disputed: 'Disputed',
  'Awaiting Review': 'Awaiting Review',
};

export function ReviewerDashboardPage({ papers, onSelectPaper }: Readonly<ReviewerDashboardPageProps>) {
  const reviewOpportunities = papers.filter((paper) => paper.status === 'Under Review' || paper.status === 'Awaiting Review');
  const [acceptedReviews, setAcceptedReviews] = useState<string[]>([]);
  const [declinedReviews, setDeclinedReviews] = useState<string[]>([]);
  const totalStake = reviewOpportunities.reduce((sum, paper) => sum + (paper.stakeRequired ?? 100), 0);
  const pendingStake = reviewOpportunities
    .filter((paper) => acceptedReviews.includes(paper.id))
    .reduce((sum, paper) => sum + (paper.stakeRequired ?? 100), 0);
  const totalReward = reviewOpportunities.reduce((sum, paper) => sum + (paper.reviewReward ?? 220), 0);
  const pendingRewards = reviewOpportunities
    .filter((paper) => acceptedReviews.includes(paper.id))
    .reduce((sum, paper) => sum + (paper.reviewReward ?? 220), 0);

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Reviewer dashboard</p>
          <h1 className="text-4xl font-semibold tracking-tight mt-3">Review queue & staking overview</h1>
          <p className="mt-4 text-sm text-zinc-500 max-w-2xl">
            See active review opportunities, stake requirements, and reward potential for papers currently under review.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[color:var(--color-primary-light)] transition-colors"
        >
          <Sparkles className="w-4 h-4" /> Discover review work
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-[color:var(--color-primary)]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Open review tasks</p>
              <p className="text-2xl font-semibold text-zinc-900">{reviewOpportunities.length}</p>
            </div>
          </div>
          <p className="text-sm text-zinc-500">Papers currently accepting staked reviews.</p>
        </div>

        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-[color:var(--color-accent)]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Active stakes</p>
              <p className="text-2xl font-semibold text-zinc-900">{pendingStake} ADA</p>
            </div>
          </div>
          <p className="text-sm text-zinc-500">
            Stake already committed to accepted review opportunities.
          </p>
          <div className="mt-4 rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-700">
            Pending reward: <span className="font-semibold text-[color:var(--color-accent)]">{pendingRewards} peerA</span>
          </div>
        </div>

        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-[color:var(--color-primary)]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Potential reward</p>
              <p className="text-2xl font-semibold text-[color:var(--color-accent)]">{totalReward} peerA</p>
            </div>
          </div>
          <p className="text-sm text-zinc-500">Maximum token reward across all active review opportunities.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="space-y-6">
          <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[color:var(--color-border)] bg-white">
              <h2 className="text-lg font-semibold text-zinc-900">Active review opportunities</h2>
              <p className="text-sm text-zinc-500 mt-1">Select a paper to view details and stake for review.</p>
            </div>
            <div className="space-y-4 p-6">
              {reviewOpportunities.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[color:var(--color-border)] p-8 text-center text-sm text-zinc-500">
                  No papers are currently accepting new peer review stakes.
                </div>
              ) : (
                reviewOpportunities.map((paper) => {
                  const isAccepted = acceptedReviews.includes(paper.id);
                  const isDeclined = declinedReviews.includes(paper.id);
                  return (
                    <div
                      key={paper.id}
                      className="w-full rounded-3xl border border-[color:var(--color-border)] bg-white p-5 hover:border-[color:var(--color-primary)]/30 transition-colors"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-zinc-900">{paper.title}</h3>
                            <p className="mt-2 text-sm text-zinc-500 line-clamp-2">{paper.abstract}</p>
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-zinc-400">{STATUS_LABELS[paper.status]}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                          <span className="rounded-full border border-zinc-200 px-2 py-1">{paper.reviewMode ?? 'Open'} review</span>
                          <span className="rounded-full border border-zinc-200 px-2 py-1">{paper.stakeRequired ?? 100} ADA stake</span>
                          <span className="rounded-full border border-zinc-200 px-2 py-1">{paper.reviewReward ?? 220} peerA</span>
                          {isAccepted && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">Accepted</span>
                          )}
                          {isDeclined && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-red-700">Declined</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!acceptedReviews.includes(paper.id)) {
                                  setAcceptedReviews((current) => [...current, paper.id]);
                                  setDeclinedReviews((current) => current.filter((id) => id !== paper.id));
                                }
                              }}
                              className="rounded-full border border-[color:var(--color-primary)] px-3 py-2 text-xs font-semibold text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10 transition-colors"
                            >
                              {isAccepted ? 'Accepted' : 'Accept'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!declinedReviews.includes(paper.id)) {
                                  setDeclinedReviews((current) => [...current, paper.id]);
                                  setAcceptedReviews((current) => current.filter((id) => id !== paper.id));
                                }
                              }}
                              className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                            >
                              {isDeclined ? 'Declined' : 'Decline'}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectPaper(paper)}
                            className="rounded-full bg-[color:var(--color-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[color:var(--color-primary-light)] transition-colors"
                          >
                            View details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-5 h-5 text-zinc-500" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Status legend</h2>
            </div>
            <div className="space-y-4 text-sm text-zinc-600">
              <div>
                <p className="font-semibold text-zinc-900">Awaiting Anchor</p>
                <p className="mt-1 text-zinc-500">Paper metadata was uploaded, but the Cardano anchor transaction has not yet been confirmed.</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-900">Confirming</p>
                <p className="mt-1 text-zinc-500">The paper’s IPFS CID has been submitted on-chain and is waiting final confirmation.</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-900">Under Review</p>
                <p className="mt-1 text-zinc-500">Reviewers can stake and submit feedback while the paper is receiving peer review.</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-900">Reviewed</p>
                <p className="mt-1 text-zinc-500">The review process is complete and the paper has been peer-reviewed.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
