import { motion } from 'motion/react';
import {
  ArrowRight, FileText, ShieldCheck, Award, AlertCircle,
  Upload, Gift, Database, Gavel
} from 'lucide-react';

interface LandingPageProps {
  onExplore: () => void;
  onPublish: () => void;
}

const STATS = [
  { label: 'Papers Published',  value: '1,420', icon: FileText },
  { label: 'Active Reviewers',  value: '458',   icon: ShieldCheck },
  { label: 'peerA Distributed', value: '2.5M',  icon: Award },
  { label: 'Open Disputes',     value: '12',    icon: AlertCircle },
];

const FEATURES = [
  { title: 'Publishing',   desc: 'Secure your research on-chain with IPFS content addressing and permanent timestamps.',                              icon: Upload },
  { title: 'Peer Review',  desc: 'Incentivized review process where experts stake ADA to guarantee accuracy.',                                       icon: ShieldCheck },
  { title: 'Rewards',      desc: 'Contributors earn peerA tokens for reviews, citations, and maintaining high reputation.',                          icon: Gift },
  { title: 'Reputation',   desc: 'Build a verifiable academic identity with weighted scores across disciplines.',                                    icon: Award },
  { title: 'Disputes',     desc: 'Transparent governance mechanism to resolve scientific disagreements fairly.',                                     icon: Gavel },
  { title: 'Governance',   desc: 'The community votes on protocol upgrades, treasury grants, and review standards.',                                 icon: Database },
];

export function LandingPage({ onExplore, onPublish }: LandingPageProps) {
  return (
    <div className="pt-32 pb-20 max-w-7xl mx-auto px-6">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-20">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-semibold tracking-tight leading-[1.1] mb-6 text-zinc-900"
        >
          Science without gatekeepers.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-zinc-500 mb-10"
        >
          APeer is a decentralized publishing platform on Cardano.
          Researchers publish, peers validate, and the community governs.
        </motion.p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onExplore}
            className="px-8 py-3.5 bg-[color:var(--color-primary)] text-white font-medium rounded-lg hover:bg-[color:var(--color-primary-light)] transition-all flex items-center gap-2 shadow-lg"
          >
            Explore Papers <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onPublish}
            className="px-8 py-3.5 border border-zinc-200 text-zinc-600 font-medium rounded-lg hover:bg-white transition-all bg-[color:var(--color-surface)]/50"
          >
            Submit Research
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-24">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="p-6 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-xl card-shadow"
          >
            <div className="flex items-center gap-3 text-zinc-400 mb-3">
              <stat.icon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-3xl font-semibold text-zinc-900 font-mono italic">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-8">
        {FEATURES.map((feat) => (
          <div
            key={feat.title}
            className="group p-8 rounded-2xl border border-transparent hover:border-[color:var(--color-border)] hover:bg-white transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center mb-6 text-[color:var(--color-primary)] group-hover:scale-110 transition-transform">
              <feat.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-3 text-zinc-900">{feat.title}</h3>
            <p className="text-zinc-500 leading-relaxed text-sm">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
