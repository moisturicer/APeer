export type View = 'landing' | 'discover' | 'detail' | 'profile' | 'submit' | 'governance';

export type ReviewMode = 'Open' | 'Blind';

export type ConfirmationStatus =
  | 'pending_anchor'
  | 'pending_confirmation'
  | 'confirmed'
  | 'confirmation_timeout';

export interface Author {
  id: string;
  address: string;
  reputation: number;
  badges: string[];
}

export interface Paper {
  id: string;
  cid?: string;
  title: string;
  abstract: string;
  authors: Author[];
  ipfsHash: string;
  date: string;
  tags: string[];
  reviewMode?: ReviewMode;
  status: 'Reviewed' | 'Under Review' | 'Disputed' | 'Awaiting Review';
  confirmationStatus?: ConfirmationStatus;
  txHash?: string | null;
  sha256?: string;
  reviewCount: number;
  views: number;
  citations: number;
  rewardPool: number;
}

// ── Nonce / auth ──────────────────────────────────────────────────────────────

export interface NonceResponse {
  nonce: string;
  expiresAt: number;
}

// ── Paper submission ──────────────────────────────────────────────────────────

// Cardano metadata strings > 64 bytes are represented as string[]
type MetaStr = string | string[];

export interface Cip25AssetMetadata {
  name: MetaStr;
  description: MetaStr;
  authors: MetaStr[];
  tags: MetaStr[];
  review_mode: ReviewMode;
  ipfs_cid: MetaStr;
  version: string;
}

export interface Cip25Metadata {
  '721': {
    [policyId: string]: {
      [assetName: string]: Cip25AssetMetadata;
    };
  };
}

export interface MetadataForTx {
  label: '721';
  metadata: Cip25Metadata;
}

export interface SubmitPaperResponse {
  cid: string;
  pinned: boolean;
  sha256: string;
  metadataForTx: MetadataForTx;
}

export interface ConfirmPaperResponse {
  cid: string;
  txHash: string;
  confirmationStatus: ConfirmationStatus;
  message: string;
}

export interface PapersListResponse {
  papers: Paper[];
  total: number;
  page: number;
  limit: number;
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
  transactions?: WalletTransaction[];
  note?: string;
}

export interface WalletTransaction {
  txHash: string;
  blockHeight: number;
  blockTime: string;
}

export interface ApiResponse<T> {
  status: number;
  data?: T;
  error?: string;
}
