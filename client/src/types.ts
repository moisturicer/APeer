export type View = 'landing' | 'discover' | 'detail' | 'profile' | 'submit' | 'governance';

export interface Author {
  id: string;
  address: string;
  reputation: number;
  badges: string[];
}

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  authors: Author[];
  ipfsHash: string;
  date: string;
  tags: string[];
  status: 'Reviewed' | 'Under Review' | 'Disputed' | 'Awaiting Review';
  reviewCount: number;
  views: number;
  citations: number;
  rewardPool: number;
}

export interface Review {
  id: string;
  paperId: string;
  reviewerAddress: string;
  reviewerReputation: number;
  text: string;
  rewardEarned: number;
  helpfulVotes: number;
  isSlashed: boolean;
}

export interface Proposal {
  id: string;
  title: string;
  status: 'Active' | 'Passed' | 'Failed';
  proposer: string;
  forPct: number;
  againstPct: number;
}

export interface WalletInfo {
  address: string;
  balance: {
    lovelace: string;
    ada: string;
    peerA: string;
  };
  stakeAddress: string | null;
  network: string;
  note?: string;
}

export interface ApiResponse<T> {
  status: number;
  data?: T;
  error?: string;
}
