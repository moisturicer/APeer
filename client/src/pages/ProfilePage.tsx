import { useEffect, useState } from 'react';
import { TrendingUp, PlusCircle, CreditCard, ChevronRight, Pencil, Check } from 'lucide-react';
import { Badge } from '../components/Badge';
import { useWalletInfo } from '../hooks/useBlockfrost';
import type { Paper } from '../types';

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
  const normalizedAddress = walletAddress?.toLowerCase() ?? null;
  const authoredPapers = normalizedAddress
    ? papers.filter((paper) => paper.authors.some((author) => author.address.toLowerCase() === normalizedAddress))
    : [];
  const totalReviews = authoredPapers.reduce((sum, paper) => sum + paper.reviewCount, 0);
  const totalPeerA = authoredPapers.reduce((sum, paper) => sum + paper.rewardPool, 0);
  const totalDisputes = authoredPapers.filter((paper) => paper.status === 'Disputed').length;
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
  const recentTransactions = walletInfo?.transactions ?? [];
  const isWalletDataAvailable = connected && !!walletAddress;
  const isPreprod = walletInfo?.network === 'preprod';
  const adaLabel = isPreprod ? 'tADA' : 'ADA';
  const profileNameStorageKey = walletAddress ? `apeer.profile.name:${walletAddress.toLowerCase()}` : null;

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

          {/* Papers table */}
          <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl overflow-hidden">
            <div className="flex border-b border-[color:var(--color-border)]">
              <button className="px-8 py-4 text-sm font-semibold border-b-2 border-[color:var(--color-primary)] text-[color:var(--color-primary)]">
                Your Published Papers
              </button>
              <button className="px-8 py-4 text-sm font-semibold text-zinc-400 hover:text-zinc-600">
                Reviews Given
              </button>
              <button className="px-8 py-4 text-sm font-semibold text-zinc-400 hover:text-zinc-600">
                Contributions
              </button>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                {authoredPapers.length === 0 ? (
                  <div className="p-6 border border-dashed border-[color:var(--color-border)] rounded-xl text-sm text-zinc-500">
                    No papers found for your connected wallet address yet.
                  </div>
                ) : (
                  authoredPapers.slice(0, 5).map((paper) => (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() => onSelectPaper(paper)}
                      className="w-full text-left p-4 border border-[color:var(--color-border)] rounded-xl hover:bg-zinc-50 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <h4 className="font-semibold text-zinc-900 group-hover:text-[color:var(--color-primary)] transition-colors">
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
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))
                )}
              </div>
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
