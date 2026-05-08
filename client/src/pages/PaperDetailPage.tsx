import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp, Award, ShieldCheck, Gift, AlertCircle,
  MessageSquare, Gavel
} from 'lucide-react';
import type { Paper, Review } from '../types';

interface PaperDetailPageProps {
  paper: Paper;
  reviews: Review[];
}

const TABS = ['Abstract', 'Full Paper', 'Reviews', 'Disputes', 'History'];

export function PaperDetailPage({ paper, reviews }: PaperDetailPageProps) {
  const [activeTab, setActiveTab] = useState('Abstract');
  const [showViewedPulse, setShowViewedPulse] = useState(true);
  const paperReviews = reviews.filter((r) => r.paperId === paper.id);
  const primaryAuthor = paper.authors[0];

  useEffect(() => {
    setShowViewedPulse(true);
    const timeout = globalThis.setTimeout(() => {
      setShowViewedPulse(false);
    }, 2200);
    return () => {
      globalThis.clearTimeout(timeout);
    };
  }, [paper.id]);

  return (
    <div className="pt-24 pb-24 max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Main content */}
        <div className="lg:col-span-3">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono text-zinc-400 bg-zinc-100 rounded px-2 py-1">
                IPFS: {paper.ipfsHash}
              </span>
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
                <EmptyState icon={MessageSquare} message="Full paper rendering is not available yet. Open from IPFS CID." />
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
                {paperReviews.length > 0 ? (
                  paperReviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-6 border border-[color:var(--color-border)] rounded-2xl bg-[color:var(--color-surface)] relative overflow-hidden"
                    >
                      {review.isSlashed && (
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
                            <div className="text-sm font-semibold">{review.reviewerAddress}</div>
                            <div className="text-[10px] text-zinc-400 font-bold uppercase">
                              Reputation {review.reviewerReputation}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[color:var(--color-accent)] font-bold text-xs">
                          <Gift className="w-3.5 h-3.5" />
                          +{review.rewardEarned} peerA
                        </div>
                      </div>
                      <p className="text-sm text-zinc-600 leading-relaxed mb-4">"{review.text}"</p>
                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-[color:var(--color-primary)] transition-colors">
                          <TrendingUp className="w-3.5 h-3.5" /> Helpful ({review.helpfulVotes})
                        </button>
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
              Lock <strong>100 ADA</strong> to provide a technical review. Earn{' '}
              <strong>250 peerA</strong> and <strong>+15 Reputation</strong> for high-quality feedback.
            </p>
            <button className="w-full py-2.5 bg-[color:var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[color:var(--color-primary-light)] transition-all shadow-sm">
              Initialize Stake
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
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
      <Icon className="w-8 h-8 text-zinc-300 mx-auto mb-4" />
      <p className="text-zinc-400 font-medium tracking-tight">{message}</p>
    </div>
  );
}
