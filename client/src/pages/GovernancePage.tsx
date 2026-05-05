import { useState } from 'react';
import { motion } from 'motion/react';
import { Database, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Badge } from '../components/Badge';

export function GovernancePage() {
  const [voted, setVoted] = useState<string[]>([]);
  const proposals: Array<{
    id: string;
    title: string;
    status: 'Active' | 'Passed' | 'Failed';
    proposer: string;
    forPct: number;
    againstPct: number;
  }> = [];

  const handleVote = (id: string) => {
    if (!voted.includes(id)) setVoted((v) => [...v, id]);
  };

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Platform Governance</h1>
          <p className="text-zinc-500 text-sm">Decentralized protocols built and maintained by the scientific community.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-2.5 bg-[color:var(--color-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[color:var(--color-primary-light)] transition-all">
            New Proposal
          </button>
          <button className="px-6 py-2.5 border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold rounded-xl hover:bg-zinc-50">
            Delegation Hub
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Proposals */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Database className="w-3.5 h-3.5" /> Active Proposals
          </h2>

          {proposals.length === 0 && (
            <div className="p-8 bg-[color:var(--color-surface)] border border-dashed border-[color:var(--color-border)] rounded-2xl text-sm text-zinc-500">
              No active governance proposals yet.
            </div>
          )}

          {proposals.map((prop) => (
            <div
              key={prop.id}
              className="p-8 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl card-shadow hover:border-[color:var(--color-primary)]/20 transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <Badge variant={prop.status === 'Active' ? 'amber' : 'teal'}>{prop.status}</Badge>
                <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Snapshot: q3_may_24
                </span>
              </div>

              <h3 className="text-xl font-bold mb-6 group-hover:text-[color:var(--color-primary)] transition-colors">
                {prop.title}
              </h3>

              {/* Vote bar */}
              <div className="space-y-4 mb-8">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-[color:var(--color-primary)]">Staked For: {prop.forPct}%</span>
                    <span className="text-zinc-400">Against: {prop.againstPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prop.forPct}%` }}
                      className="h-full bg-[color:var(--color-primary)]"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prop.againstPct}%` }}
                      className="h-full bg-zinc-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-zinc-50">
                <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                  Proposed by:{' '}
                  <span className="font-mono text-zinc-900">{prop.proposer.slice(0, 10)}...</span>
                </div>
                <div className="flex gap-3">
                  {voted.includes(prop.id) ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-400 text-xs font-bold rounded-lg cursor-default">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Vote Cast
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleVote(prop.id)}
                        className="px-6 py-2 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] text-xs font-bold rounded-lg hover:bg-[color:var(--color-primary)]/20 transition-colors"
                      >
                        Vote For
                      </button>
                      <button
                        onClick={() => handleVote(prop.id)}
                        className="px-6 py-2 border border-[color:var(--color-border)] text-zinc-500 text-xs font-bold rounded-lg hover:bg-zinc-50 transition-colors"
                      >
                        Abstain
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Treasury */}
          <div className="p-8 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-2xl card-shadow">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Treasury Overview</h2>
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="text-xs text-zinc-500 font-medium">Protocol Controlled Assets</div>
                <div className="text-3xl font-mono font-bold italic text-zinc-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[color:var(--color-accent)] flex items-center justify-center text-sm text-white font-bold italic shadow-sm">
                    p
                  </div>
                  14.2M peerA
                </div>
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                  ≈ $2.4M USD on-chain valuation
                </div>
              </div>
              <div className="h-px bg-zinc-100" />
              <div className="space-y-5">
                {[
                  { label: 'Pending Grants',    value: '12',          red: false },
                  { label: 'Milestone Rewards', value: '245k peerA',  red: false },
                  { label: 'In-Dispute Funds',  value: '45k peerA',   red: true  },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center group">
                    <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-900 transition-colors cursor-pointer">
                      {row.label}
                    </span>
                    <span className={`text-sm font-mono font-bold ${row.red ? 'text-red-500' : ''}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ethics card */}
          <div className="p-8 bg-zinc-900 text-white rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[color:var(--color-primary-light)]" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Governance Ethics</h2>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed font-light">
              Staking your <span className="text-white font-medium">peerA</span> tokens in the governance pool
              increases your voting weight and qualifies you for delegation rewards. Proposals require a{' '}
              <strong className="text-white">60% majority</strong> to pass.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
