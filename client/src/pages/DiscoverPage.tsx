import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Gift, TrendingUp, MessageSquare, Eye } from 'lucide-react';
import { Badge } from '../components/Badge';
import type { Paper } from '../types';

interface DiscoverPageProps {
  papers: Paper[];
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  onSelectPaper: (p: Paper) => void;
}

const STATUS_LABELS: Record<Paper['status'], string> = {
  Reviewed: 'Peer Reviewed',
  'Under Review': 'Under Review',
  Disputed: 'Disputed',
  'Awaiting Review': 'Awaiting Review',
};

export function DiscoverPage({ papers, loading = false, error = null, onReload, onSelectPaper }: DiscoverPageProps) {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Paper['status'][]>([]);
  const [sortBy, setSortBy] = useState<'latest' | 'citations' | 'rewards'>('latest');

  const tags = useMemo(
    () => [...new Set(papers.flatMap((paper) => paper.tags))].sort((a, b) => a.localeCompare(b)),
    [papers],
  );

  const filteredPapers = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const filtered = papers.filter((paper) => {
      const matchQuery =
        lowered.length === 0 ||
        paper.title.toLowerCase().includes(lowered) ||
        paper.abstract.toLowerCase().includes(lowered) ||
        paper.ipfsHash.toLowerCase().includes(lowered) ||
        paper.authors.some((author) => author.address.toLowerCase().includes(lowered));

      const matchTags = selectedTags.length === 0 || selectedTags.some((tag) => paper.tags.includes(tag));
      const matchStatus = selectedStatuses.length === 0 || selectedStatuses.includes(paper.status);
      return matchQuery && matchTags && matchStatus;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'citations') return b.citations - a.citations;
      if (sortBy === 'rewards') return b.rewardPool - a.rewardPool;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [papers, query, selectedTags, selectedStatuses, sortBy]);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag],
    );
  };

  const toggleStatus = (status: Paper['status']) => {
    setSelectedStatuses((current) =>
      current.includes(status) ? current.filter((entry) => entry !== status) : [...current, status],
    );
  };

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-6 flex gap-10">
      {/* Sidebar filters */}
      <aside className="w-64 flex-shrink-0">
        <div className="sticky top-24">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6">Tags</h2>
          <div className="space-y-1 mb-8">
            {tags.map((tag) => (
              <label key={tag} className="flex items-center gap-3 p-2 rounded-md hover:bg-white cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  className="w-4 h-4 rounded border-zinc-300 text-[color:var(--color-primary)] focus:ring-[color:var(--color-primary)]"
                />
                <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">{tag}</span>
              </label>
            ))}
          </div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6">Review Status</h2>
          <div className="space-y-1">
            {(Object.keys(STATUS_LABELS) as Paper['status'][]).map((status) => (
              <label key={status} className="flex items-center gap-3 p-2 rounded-md hover:bg-white cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status)}
                  onChange={() => toggleStatus(status)}
                  className="w-4 h-4 rounded border-zinc-300 text-[color:var(--color-primary)] focus:ring-[color:var(--color-primary)]"
                />
                <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">{STATUS_LABELS[status]}</span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* Paper feed */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search titles, authors, or IPFS hashes..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-[color:var(--color-primary)]/20 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as 'latest' | 'citations' | 'rewards')}
              className="bg-transparent text-sm font-semibold border-none focus:ring-0 cursor-pointer"
            >
              <option value="latest">Latest</option>
              <option value="citations">Most Cited</option>
              <option value="rewards">Highest Rewards</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-sm text-zinc-400">Loading papers...</p>}
          {!loading && error && (
            <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl text-sm text-amber-700 flex items-center justify-between gap-4">
              <span>Unable to refresh papers: {error}</span>
              {onReload && (
                <button
                  type="button"
                  onClick={onReload}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          {!loading && filteredPapers.length === 0 && (
            <p className="text-sm text-zinc-400">No papers match your current filters.</p>
          )}
          {filteredPapers.map((paper) => (
            <motion.div
              key={paper.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => onSelectPaper(paper)}
              className="p-6 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-xl card-shadow hover:border-[color:var(--color-primary)]/30 transition-all group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-wrap gap-2">
                  {paper.status === 'Reviewed' && <Badge variant="teal">Peer Reviewed</Badge>}
                  {paper.status === 'Under Review' && <Badge variant="amber">Under Review</Badge>}
                  {paper.status === 'Disputed' && <Badge variant="red">Disputed</Badge>}
                  {paper.status === 'Awaiting Review' && <Badge variant="gray">Awaiting Review</Badge>}
                </div>
                <div className="flex items-center gap-1.5 text-[color:var(--color-accent)]">
                  <Gift className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold">{paper.rewardPool} peerA</span>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2 group-hover:text-[color:var(--color-primary)] transition-colors">
                {paper.title}
              </h3>

              <div className="flex items-center gap-3 mb-4">
                {paper.authors[0] ? (
                  <>
                    <div className="text-xs font-mono text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100">
                      {paper.authors[0].address.slice(0, 8)}...
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[color:var(--color-primary)] px-1.5 py-0.5 rounded bg-[color:var(--color-primary)]/5 uppercase tracking-wider">
                      <TrendingUp className="w-3 h-3" />
                      Rep {paper.authors[0].reputation}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-zinc-400">Unknown author</div>
                )}
                <span className="text-zinc-300">•</span>
                <span className="text-xs text-zinc-400 font-medium italic">{paper.date}</span>
              </div>

              <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2 mb-6">
                {paper.abstract}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                <div className="flex gap-2">
                  {paper.tags.map((tag) => (
                    <span key={tag} className="text-[11px] font-medium text-zinc-400 bg-zinc-100/50 px-2 py-1 rounded">
                      #{tag.toLowerCase()}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                  <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> {paper.reviewCount} Reviews</span>
                  <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {paper.views} Views</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
