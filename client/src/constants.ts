import type { Paper, Proposal, Review } from './types';

export const MOCK_PAPERS: Paper[] = [
  {
    id: 'paper-1',
    title: 'Deterministic Finality in UTXO-Driven Validator Clusters',
    abstract: 'A practical approach to reducing settlement latency in stake-based decentralized networks.',
    authors: [
      { id: 'a1', address: 'addr1uxy8xw3p09kzl2r5s9q9xz2pmskl09x2s7m9z1', reputation: 1420, badges: ['Top Reviewer Q1'] },
    ],
    ipfsHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkddfLNO5n2K',
    date: '2026-04-29',
    tags: ['Cardano', 'Consensus', 'Networking'],
    status: 'Under Review',
    reviewCount: 3,
    views: 912,
    citations: 18,
    rewardPool: 1200,
  },
  {
    id: 'paper-2',
    title: 'Peer-Weighted Reputation Signals for Open Scientific Markets',
    abstract: 'We propose a composable reputation signal that adapts to discipline-specific quality priors.',
    authors: [
      { id: 'a2', address: 'addr1v0kgtaq2n9qvme2aqx6w5nr6vlz3f5e7vjr3z6f4', reputation: 980, badges: [] },
    ],
    ipfsHash: 'QmVQfM9Pz7F8Y9p9Y3q8Q3hL6e5k4x2g2q8b8n9f4d1g',
    date: '2026-04-18',
    tags: ['Reputation', 'DAO', 'Governance'],
    status: 'Reviewed',
    reviewCount: 7,
    views: 1340,
    citations: 34,
    rewardPool: 2400,
  },
  {
    id: 'paper-3',
    title: 'Dispute Escalation Heuristics in Tokenized Peer Review',
    abstract: 'This paper evaluates slashing and escalation parameters under adversarial reviewer behavior.',
    authors: [
      { id: 'a3', address: 'addr1p2e8kzv8e9s3t7n3x9c5a4g2m1l9v7j4d8a2f3k6', reputation: 760, badges: [] },
    ],
    ipfsHash: 'QmZZc71f1x8jzA2gK4YwB8qN2rL6pS3fV9mQ1xT8pH2f',
    date: '2026-04-05',
    tags: ['Disputes', 'Mechanism Design'],
    status: 'Disputed',
    reviewCount: 4,
    views: 507,
    citations: 9,
    rewardPool: 900,
  },
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'review-1',
    paperId: 'paper-1',
    reviewerAddress: 'addr1reviewer9y2k3t4x5f6m7n8p9q0r1',
    reviewerReputation: 1180,
    text: 'Methodology is sound overall. Section 4 needs clearer assumptions for the validator churn model.',
    rewardEarned: 180,
    helpfulVotes: 21,
    isSlashed: false,
  },
  {
    id: 'review-2',
    paperId: 'paper-1',
    reviewerAddress: 'addr1reviewer2f7k2a9q6h2w1p4m8x3s9',
    reviewerReputation: 860,
    text: 'Benchmarks are promising; please include confidence intervals and baseline parameter tables.',
    rewardEarned: 140,
    helpfulVotes: 11,
    isSlashed: false,
  },
  {
    id: 'review-3',
    paperId: 'paper-3',
    reviewerAddress: 'addr1reviewer4t8x2s6m9n3q7w1p5h2k0',
    reviewerReputation: 510,
    text: 'Conclusions overstate resistance to collusion. Additional adversarial simulations are required.',
    rewardEarned: 80,
    helpfulVotes: 4,
    isSlashed: true,
  },
];

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'prop-1',
    title: 'Increase minimum reviewer stake from 50 ADA to 75 ADA',
    status: 'Active',
    proposer: 'addr1proposer8x2q4w6e1r3t5y7u9i0o2p4',
    forPct: 62,
    againstPct: 38,
  },
  {
    id: 'prop-2',
    title: 'Allocate 200k peerA to early-stage replication grants',
    status: 'Active',
    proposer: 'addr1proposer3m7n2b6v1c5x9z4a8s0d3f1',
    forPct: 71,
    againstPct: 29,
  },
];
