import { useEffect, useState } from 'react';
import { TrendingUp, PlusCircle, CreditCard, ChevronRight, Pencil, Check, ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react';
import { Badge } from '../components/Badge';
import { useWalletInfo } from '../hooks/useBlockfrost';
import { mintAnchorTx } from '../lib/mintAnchorTx';
import type { MetadataForTx, Paper } from '../types';

interface ProfilePageProps {
  papers: Paper[];
  connected: boolean;
  walletAddress: string | null;
  walletName: string | null;
  onPublish: () => void;
  onSelectPaper: (paper: Paper) => void;
  lastSyncedAt?: string | null;
}

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

export function ProfilePage({
  papers,
  connected,
  walletAddress,
  walletName,
  onPublish,
  onSelectPaper,
  lastSyncedAt = null,
}: Readonly<ProfilePageProps>) {
  const { data: walletInfo, loading: walletLoading, error: walletError } = useWalletInfo(walletAddress);
  const [displayName, setDisplayName] = useState('Researcher');
  const [draftName, setDraftName] = useState('Researcher');
  const [editingName, setEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState<'papers' | 'reviews' | 'contributions'>('papers');
  const [retryingPapers, setRetryingPapers] = useState<Set<string>>(new Set());
  const [retryMessages, setRetryMessages] = useState<Record<string, string>>({});
  const normalizedAddress = walletAddress?.toLowerCase() ?? null;
  const authoredPapers = normalizedAddress
    ? papers.filter((paper) => paper.authors.some((author) => author.address.toLowerCase() === normalizedAddress))
    : [];
  const totalReviews = authoredPapers.reduce((sum, paper) => sum + paper.reviewCount, 0);
  const totalPeerA = authoredPapers.reduce((sum, paper) => sum + paper.rewardPool, 0);
  const totalDisputes = authoredPapers.filter((paper) => paper.status === 'Disputed').length;
  const reviewOpportunities = papers.filter(
    (paper) => paper.status === 'Under Review' || paper.status === 'Awaiting Review',
  );
  const pendingStake = reviewOpportunities.reduce((sum, paper) => sum + (paper.stakeRequired ?? 100), 0);
  const pendingPeerA = reviewOpportunities.reduce((sum, paper) => sum + (paper.reviewReward ?? 220), 0);
  const reputation =
    normalizedAddress
      ? papers
          .flatMap((paper) => paper.authors)
          .find((author) => author.address.toLowerCase() === normalizedAddress)?.reputation ?? null
      : null;
  const shortAddress = walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : 'No wallet connected';
  const avatarLabel = walletAddress ? walletAddress.slice(4, 8).toUpperCase() : '--';
  const stats = [
    { label: 'Papers', val: String(authoredPapers.length) },
    { label: 'Reviews', val: String(totalReviews) },
    { label: 'peerA Earned', val: totalPeerA.toLocaleString(), isToken: true },
    { label: 'Disputes', val: String(totalDisputes) },
  ];
  // Reviews Given — papers where the connected wallet submitted a review
  const reviewsGiven = normalizedAddress
    ? papers.flatMap((paper) =>
        (paper.reviews ?? [])
          .filter((r) => r.reviewerAddress.toLowerCase() === normalizedAddress)
          .map((r) => ({ review: r, paper }))
      )
    : [];

  // Contributions — all papers the wallet is listed as an author on
  // (same set as authoredPapers but we show co-author context)
  const contributedPapers = normalizedAddress
    ? papers.filter((paper) =>
        paper.authors.some((a) => a.address.toLowerCase() === normalizedAddress)
      )
    : [];

  const totalCitations = contributedPapers.reduce((sum, p) => sum + p.citations, 0);
  const totalViews = contributedPapers.reduce((sum, p) => sum + p.views, 0);

  const recentTransactions = walletInfo?.transactions ?? [];
  const isWalletDataAvailable = connected && !!walletAddress;
  const isPreprod = walletInfo?.network === 'preprod';
  const adaLabel = isPreprod ? 'tADA' : 'ADA';
  const profileNameStorageKey = walletAddress ? `apeer.profile.name:${walletAddress.toLowerCase()}` : null;

  function getAssetName(id: string): string {
    return id.length <= 32 ? id : id.slice(0, 32);
  }

  function buildMetadataForPaper(paper: Paper): MetadataForTx {
    const assetName = getAssetName(paper.id);

    return {
      label: '721',
      metadata: {
        '721': {
          'test_peera_policy_000000000000000000000000000000000000000000000000000000': {
            [assetName]: {
              name: paper.title,
              description: paper.abstract,
              authors: paper.authors.map((author) => author.address),
              tags: paper.tags,
              review_mode: paper.reviewMode ?? 'Open',
              ipfs_cid: paper.ipfsHash,
              version: '1.0',
            },
          },
        },
      },
    };
  }

  async function handleRetryAnchor(paper: Paper) {
    if (!walletName) {
      setRetryMessages(prev => ({ ...prev, [paper.id]: 'No wallet provider available for retry.' }));
      return;
    }

    if (!walletAddress) {
      setRetryMessages(prev => ({ ...prev, [paper.id]: 'No wallet address available for retry.' }));
      return;
    }

    const metadata = paper.metadataForTx ?? buildMetadataForPaper(paper);

    setRetryMessages(prev => ({ ...prev, [paper.id]: '' }));
    setRetryingPapers(prev => new Set(prev).add(paper.id));

    try {
      const txHash = await mintAnchorTx(walletName, walletAddress, metadata);
      setRetryMessages(prev => ({ ...prev, [paper.id]: `Anchor submitted. TxHash: ${txHash.slice(0, 16)}…` }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setRetryMessages(prev => ({ ...prev, [paper.id]: `Anchor retry failed: ${message}` }));
      console.error('Anchor retry error', error);
    } finally {
      setRetryingPapers(prev => {
        const next = new Set(prev);
        next.delete(paper.id);
        return next;
      });
    }
  }

  useEffect(() => {
    if (!walletAddress) {
      setDisplayName('Researcher');
      setDraftName('Researcher');
      setEditingName(false);
      return;
    }

    const fallback = walletName?.trim() || 'Researcher';
    const stored = profileNameStorageKey ? globalThis.localStorage.getItem(profileNameStorageKey) : null;
    const nextName = stored && stored.trim().length > 0 ? stored : fallback;
    setDisplayName(nextName);
    setDraftName(nextName);
    setEditingName(false);
  }, [walletAddress, walletName, profileNameStorageKey]);

  const saveDisplayName = () => {
    const nextName = draftName.trim() || 'Researcher';
    setDisplayName(nextName);
    setDraftName(nextName);
    setEditingName(false);
    if (profileNameStorageKey) {
      globalThis.localStorage.setItem(profileNameStorageKey, nextName);
    }
  };

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Sidebar */}
        <aside>
          <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl p-8 mb-6 sticky top-24">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-zinc-100 border-2 border-[color:var(--color-border)] mb-6 mx-auto flex items-center justify-center text-2xl font-mono text-zinc-300">
              {avatarLabel}
            </div>

            {/* Identity */}
            <div className="text-center mb-8">
              {editingName ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[color:var(--color-border)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20 focus:outline-none"
                    maxLength={40}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveDisplayName}
                    className="p-1.5 rounded-lg text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10 transition-colors"
                    aria-label="Save display name"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-zinc-900">{displayName}</h2>
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="text-zinc-400 hover:text-zinc-700 transition-colors"
                    aria-label="Edit display name"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-xs font-mono text-zinc-400 mb-2">{shortAddress}</p>
              {walletName && <p className="text-[11px] text-zinc-500 mb-4">Connected via {walletName}</p>}
              <div className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-[color:var(--color-primary)]/5 text-[color:var(--color-primary)] text-xs font-bold uppercase tracking-widest border border-[color:var(--color-primary)]/10">
                <TrendingUp className="w-3.5 h-3.5" />
                {reputation === null ? 'Reputation: --' : `Reputation: ${reputation.toLocaleString()}`}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-8">
              <Badge variant={connected ? 'teal' : 'gray'}>{connected ? 'Wallet Connected' : 'Guest Mode'}</Badge>
              {authoredPapers.length > 0 && <Badge variant="amber">Published Author</Badge>}
              {totalReviews > 0 && <Badge variant="gray">Active Reviewer</Badge>}
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-2.5 border border-[color:var(--color-border)] rounded-lg text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-all">
              <CreditCard className="w-4 h-4" />
              Export Credentials
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Researcher Dashboard</h2>
            <button
              onClick={onPublish}
              className="flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[color:var(--color-primary-light)] transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Publish New Paper
            </button>
          </div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2 text-zinc-500">
              <span className="font-semibold text-zinc-400 uppercase tracking-wide">Status legend:</span>
              <span className="px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700">Awaiting Anchor</span>
              <span className="px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700">Confirming</span>
              <span className="px-2 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">Confirmed</span>
              <span className="px-2 py-0.5 rounded-full border bg-red-50 border-red-200 text-red-700">Confirmation Timeout</span>
            </div>
            <div className="text-zinc-400">
              Last sync: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : '—'}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="p-6 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-xl">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{stat.label}</div>
                <div className="text-2xl font-semibold text-zinc-900 flex items-center gap-1.5">
                  {stat.isToken && (
                    <div className="w-4 h-4 rounded-full bg-[color:var(--color-accent)] flex items-center justify-center text-[10px] text-white font-bold italic">
                      p
                    </div>
                  )}
                  {stat.val}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <div className="p-6 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Reviewer summary</p>
                  <p className="text-sm text-zinc-500">Stake and review activity in the next cycle.</p>
                </div>
                <ShieldCheck className="w-5 h-5 text-[color:var(--color-primary)]" />
              </div>
              <div className="space-y-4 text-sm text-zinc-600">
                <div className="flex items-center justify-between gap-2">
                  <span>Review opportunities</span>
                  <span className="font-semibold text-zinc-900">{reviewOpportunities.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Required stake</span>
                  <span className="font-semibold text-zinc-900">{pendingStake} ADA</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Potential peerA</span>
                  <span className="font-semibold text-[color:var(--color-accent)]">{pendingPeerA} peerA</span>
                </div>
              </div>
            </div>
            <div className="p-6 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Reviewer queue</p>
              {reviewOpportunities.length === 0 ? (
                <p className="text-sm text-zinc-500">No active review opportunities right now.</p>
              ) : (
                <div className="space-y-3">
                  {reviewOpportunities.slice(0, 3).map((paper) => (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() => onSelectPaper(paper)}
                      className="w-full text-left p-4 border border-[color:var(--color-border)] rounded-2xl hover:border-[color:var(--color-primary)]/30 transition-colors"
                    >
                      <div className="text-sm font-semibold text-zinc-900">{paper.title}</div>
                      <div className="text-xs text-zinc-400 mt-1 flex flex-wrap gap-2">
                        <span>{paper.reviewCount} reviews</span>
                        <span>{paper.stakeRequired ?? 100} ADA stake</span>
                        <span>{paper.reviewReward ?? 220} peerA</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Next steps</p>
                  <p className="text-sm text-zinc-500">Prepare your next submission and reserve stake.</p>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="space-y-3 text-sm text-zinc-600">
                <p>Keep your wallet funded with tADA to join the next review cycle.</p>
                <p>Use the reviewer dashboard to check stake status and pending rewards.</p>
              </div>
            </div>
          </div>

          {/* Wallet balances */}
          <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl p-6 mb-8">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">Wallet Balances</h3>
            {!isWalletDataAvailable && (
              <div className="p-4 border border-dashed border-[color:var(--color-border)] rounded-xl text-sm text-zinc-500">
                Connect a wallet to load ADA and peerA balances.
              </div>
            )}
            {isWalletDataAvailable && walletLoading && (
              <p className="text-sm text-zinc-500">Loading wallet balances...</p>
            )}
            {isWalletDataAvailable && !walletLoading && walletError && (
              <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl text-sm text-amber-700">
                Unable to load wallet balances: {walletError}
              </div>
            )}
            {isWalletDataAvailable && !walletLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BalanceCard label={adaLabel} value={walletInfo?.balance.ada ?? '0'} />
                <BalanceCard label="Lovelace" value={(walletInfo?.balance.lovelace ?? '0').toLocaleString()} />
                <BalanceCard label="peerA" value={walletInfo?.balance.peerA ?? '0'} token />
              </div>
            )}
          </div>

          {/* Recent transactions */}
          <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-[color:var(--color-border)]">
              <h3 className="text-sm font-semibold text-zinc-900">Recent Transactions</h3>
            </div>
            <div className="p-6 space-y-3">
              {!isWalletDataAvailable && (
                <div className="p-4 border border-dashed border-[color:var(--color-border)] rounded-xl text-sm text-zinc-500">
                  Connect a wallet to view recent on-chain transactions.
                </div>
              )}
              {isWalletDataAvailable && walletLoading && (
                <p className="text-sm text-zinc-500">Loading transactions...</p>
              )}
              {isWalletDataAvailable && !walletLoading && recentTransactions.length === 0 && (
                <div className="p-4 border border-dashed border-[color:var(--color-border)] rounded-xl text-sm text-zinc-500">
                  No transactions yet for this address.
                </div>
              )}
              {isWalletDataAvailable && !walletLoading && recentTransactions.length > 0 && (
                recentTransactions.map((tx) => (
                  <div
                    key={tx.txHash}
                    className="p-4 border border-[color:var(--color-border)] rounded-xl bg-white flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-1">Transaction</div>
                      <div className="font-mono text-sm text-zinc-700 truncate">
                        {tx.txHash}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold">
                        Block {tx.blockHeight}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(tx.blockTime).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Papers / Reviews Given / Contributions tabs */}
          <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-[color:var(--color-border)]">
              {(
                [
                  { key: 'papers', label: 'Your Published Papers', count: authoredPapers.length },
                  { key: 'reviews', label: 'Reviews Given', count: reviewsGiven.length },
                  { key: 'contributions', label: 'Contributions', count: contributedPapers.length },
                ] as const
              ).map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`px-6 py-4 text-sm font-semibold transition-colors relative whitespace-nowrap flex items-center gap-2 ${
                    activeTab === key
                      ? 'text-[color:var(--color-primary)] border-b-2 border-[color:var(--color-primary)]'
                      : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  {label}
                  <span className="px-1.5 py-0.5 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-500">
                    {count}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-8">
              {/* ── Your Published Papers ── */}
              {activeTab === 'papers' && (
                <div className="space-y-4">
                  {authoredPapers.length === 0 ? (
                    <div className="p-6 border border-dashed border-[color:var(--color-border)] rounded-xl text-sm text-zinc-500">
                      No papers found for your connected wallet address yet.
                    </div>
                  ) : (
                    authoredPapers.slice(0, 10).map((paper) => (
                      <button
                        key={paper.id}
                        type="button"
                        onClick={() => onSelectPaper(paper)}
                        className="w-full text-left p-4 border border-[color:var(--color-border)] rounded-xl hover:bg-zinc-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="min-w-0">
                          <h4 className="font-semibold text-zinc-900 group-hover:text-[color:var(--color-primary)] transition-colors truncate">
                            {paper.title}
                          </h4>
                          <div className="text-xs text-zinc-400 mt-1 flex flex-wrap items-center gap-2">
                            <span>{paper.date}</span>
                            <span>• {paper.citations} citations</span>
                            <span>• {paper.reviewCount} reviews</span>
                            <span>• {paper.views} views</span>
                            {paper.confirmationStatus && (
                              <span
                                className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
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
                            {paper.mintStatus && (
                              <span
                                className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
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
                          </div>
                          {paper.confirmationStatus === 'pending_anchor' && connected && walletAddress === paper.authors[0]?.address && walletName && (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetryAnchor(paper);
                                }}
                                disabled={retryingPapers.has(paper.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Retry anchoring transaction"
                              >
                                <RotateCcw className={`w-3 h-3 ${retryingPapers.has(paper.id) ? 'animate-spin' : ''}`} />
                                {retryingPapers.has(paper.id) ? 'Retrying…' : 'Retry'}
                              </button>
                              {retryMessages[paper.id] && (
                                <span className="text-[10px] text-amber-700 italic">{retryMessages[paper.id]}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 shrink-0 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* ── Reviews Given ── */}
              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  {!connected && (
                    <div className="p-6 border border-dashed border-[color:var(--color-border)] rounded-xl text-sm text-zinc-500">
                      Connect your wallet to see reviews you have submitted.
                    </div>
                  )}
                  {connected && reviewsGiven.length === 0 && (
                    <div className="p-6 border border-dashed border-[color:var(--color-border)] rounded-xl text-sm text-zinc-500">
                      You have not submitted any reviews yet. Browse papers in the Discover tab to start reviewing.
                    </div>
                  )}
                  {reviewsGiven.map(({ review, paper }) => (
                    <div
                      key={review.id}
                      className="p-4 border border-[color:var(--color-border)] rounded-xl bg-white space-y-3"
                    >
                      {/* Paper link */}
                      <button
                        type="button"
                        onClick={() => onSelectPaper(paper)}
                        className="text-sm font-semibold text-[color:var(--color-primary)] hover:underline text-left"
                      >
                        {paper.title}
                      </button>
                      {/* Review content */}
                      <p className="text-sm text-zinc-600 leading-relaxed line-clamp-3">
                        "{review.content}"
                      </p>
                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                        <span>{review.date}</span>
                        <span className="flex items-center gap-1">
                          Rating
                          <span className="font-bold text-zinc-700">{review.rating}/5</span>
                        </span>
                        <span className="flex items-center gap-1">
                          Stake
                          <span className="font-bold text-zinc-700">{review.stakeAmount} ADA</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${
                            review.status === 'confirmed'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : review.status === 'slashed'
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}
                        >
                          {review.status}
                        </span>
                        <span className="flex items-center gap-1 text-[color:var(--color-accent)] font-semibold">
                          +{review.rating * 50} peerA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Contributions ── */}
              {activeTab === 'contributions' && (
                <div className="space-y-6">
                  {!connected && (
                    <div className="p-6 border border-dashed border-[color:var(--color-border)] rounded-xl text-sm text-zinc-500">
                      Connect your wallet to see your contributions.
                    </div>
                  )}
                  {connected && contributedPapers.length === 0 && (
                    <div className="p-6 border border-dashed border-[color:var(--color-border)] rounded-xl text-sm text-zinc-500">
                      No contributions found. Papers you co-author will appear here.
                    </div>
                  )}
                  {connected && contributedPapers.length > 0 && (
                    <>
                      {/* Aggregate stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: 'Papers', value: contributedPapers.length },
                          { label: 'Total Citations', value: totalCitations },
                          { label: 'Total Views', value: totalViews.toLocaleString() },
                          { label: 'Confirmed On-chain', value: contributedPapers.filter((p) => p.confirmationStatus === 'confirmed').length },
                        ].map(({ label, value }) => (
                          <div key={label} className="p-4 border border-[color:var(--color-border)] rounded-xl bg-white text-center">
                            <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">{label}</div>
                            <div className="text-xl font-semibold text-zinc-900">{value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Paper list */}
                      <div className="space-y-3">
                        {contributedPapers.map((paper) => {
                          const myAuthorEntry = paper.authors.find(
                            (a) => a.address.toLowerCase() === normalizedAddress
                          );
                          const isPrimary = paper.authors[0]?.address.toLowerCase() === normalizedAddress;
                          return (
                            <button
                              key={paper.id}
                              type="button"
                              onClick={() => onSelectPaper(paper)}
                              className="w-full text-left p-4 border border-[color:var(--color-border)] rounded-xl hover:bg-zinc-50 transition-colors flex items-start justify-between gap-4 group"
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-zinc-900 group-hover:text-[color:var(--color-primary)] transition-colors">
                                    {paper.title}
                                  </h4>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                      isPrimary
                                        ? 'bg-[color:var(--color-primary)]/5 border-[color:var(--color-primary)]/20 text-[color:var(--color-primary)]'
                                        : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                                    }`}
                                  >
                                    {isPrimary ? 'Primary Author' : 'Co-author'}
                                  </span>
                                </div>
                                <div className="text-xs text-zinc-400 flex flex-wrap gap-2">
                                  <span>{paper.date}</span>
                                  <span>• {paper.authors.length} author{paper.authors.length !== 1 ? 's' : ''}</span>
                                  <span>• {paper.citations} citations</span>
                                  <span>• {paper.views} views</span>
                                  <span>• {paper.reviewCount} reviews</span>
                                  {myAuthorEntry && (
                                    <span>• Rep {myAuthorEntry.reputation}</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {paper.tags.slice(0, 4).map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-medium"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 shrink-0 text-zinc-300 group-hover:translate-x-1 transition-transform mt-1" />
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BalanceCard({ label, value, token = false }: Readonly<{ label: string; value: string; token?: boolean }>) {
  return (
    <div className="p-4 border border-[color:var(--color-border)] rounded-xl bg-white">
      <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{label}</div>
      <div className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
        {token && (
          <div className="w-4 h-4 rounded-full bg-[color:var(--color-accent)] flex items-center justify-center text-[10px] text-white font-bold italic">
            p
          </div>
        )}
        {value}
      </div>
    </div>
  );
}