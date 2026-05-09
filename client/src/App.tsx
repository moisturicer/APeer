import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./pages/LandingPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { PaperDetailPage } from "./pages/PaperDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SubmitPage } from "./pages/SubmitPage";
import { ReviewerDashboardPage } from "./pages/ReviewerDashboardPage";
import { usePapers } from "./hooks/usePapers";
import { useWallet } from "./hooks/useWallet";
import { api } from "./lib/api";
import { mintAnchorTx } from "./lib/mintAnchorTx";
import { sanitizeMetadata } from "./lib/metadataUtils";
import { MOCK_REVIEWS } from "./constants";

import type { MetadataForTx, Paper, View } from "./types";

type AvailableWallet = { id: string; name: string; icon: string };

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    papers,
    loading,
    error: papersError,
    reload: reloadPapers,
    lastSyncedAt,
  } = usePapers();
  const [wallets, setWallets] = useState<AvailableWallet[]>([]);
  const {
    connected,
    connecting,
    address,
    name,
    networkId,
    error,
    connect,
    disconnect,
    clearError,
    getAvailableWallets,
  } = useWallet();

  const reviewOpportunitiesCount = papers.filter(
    (paper) =>
      paper.reviewMode === 'Open' &&
      !paper.reviews?.some((review) => review.reviewerAddress === address)
  ).length;

  const view = getViewFromPath(location.pathname);

  useEffect(() => {
    let cancelled = false;
    getAvailableWallets()
      .then((entries) => {
        if (!cancelled) setWallets(entries);
      })
      .catch(() => {
        if (!cancelled) setWallets([]);
      });
    return () => { cancelled = true; };
  }, [getAvailableWallets]);

  useEffect(() => {
    if (!error) return;
    const timeout = globalThis.setTimeout(() => clearError(), 6000);
    return () => globalThis.clearTimeout(timeout);
  }, [error, clearError]);

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--color-background)]">
      <Navbar
        activeView={view}
        setView={(next) => navigate(pathFromView(next))}
        walletAddress={address}
        wallets={wallets}
        connecting={connecting}
        walletError={error}
        onClearWalletError={clearError}
        onConnect={connect}
        onDisconnect={disconnect}
        connected={connected}
        reviewOpportunitiesCount={reviewOpportunitiesCount}
      />

      <main className="flex-1 relative overflow-hidden">
        {location.pathname === "/" && (
          <div className="absolute top-0 left-0 right-0 h-[600px] pointer-events-none overflow-hidden">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[60%] bg-[color:var(--color-primary)]/5 blur-[120px] rounded-full" />
            <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] bg-[color:var(--color-accent)]/5 blur-[120px] rounded-full" />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <Routes>
              <Route
                path="/"
                element={
                  <LandingPage
                    papers={papers}
                    loading={loading}
                    onExplore={() => navigate("/discover")}
                    onPublish={() => navigate("/submit")}
                  />
                }
              />
              <Route
                path="/discover"
                element={
                  <DiscoverPage
                    papers={papers}
                    loading={loading}
                    error={papersError}
                    onReload={reloadPapers}
                    lastSyncedAt={lastSyncedAt}
                    onSelectPaper={(paper) => navigate(`/papers/${paper.id}`)}
                  />
                }
              />
              <Route
                path="/papers/:paperId"
                element={
                  <PaperDetailRoute
                    papers={papers}
                    loading={loading}
                    reloadPapers={reloadPapers}
                    connected={connected}
                    walletAddress={address}
                    walletName={name}
                  />
                }
              />
              <Route
                path="/profile"
                element={
                  <ProfilePage
                    papers={papers}
                    connected={connected}
                    walletAddress={address}
                    walletName={name}
                    onPublish={() => navigate("/submit")}
                    onSelectPaper={(paper) => navigate(`/papers/${paper.id}`)}
                    lastSyncedAt={lastSyncedAt}
                  />
                }
              />
              <Route
                path="/submit"
                element={
                  <SubmitPage
                    onComplete={() => navigate("/discover")}
                    connected={connected}
                    address={address}
                    walletName={name}
                    networkId={networkId}
                  />
                }
              />
              <Route
                path="/reviewer"
                element={
                  <ReviewerDashboardPage
                    papers={papers}
                    onSelectPaper={(paper) => navigate(`/papers/${paper.id}`)}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

// ─── Metadata helpers ─────────────────────────────────────────────────────────

function getAssetName(id: string): string {
  return id.length <= 32 ? id : id.slice(0, 32);
}

function buildMetadataForPaper(paper: Paper): MetadataForTx {
  const assetName = getAssetName(paper.id);
  const raw = {
    label: '721',
    metadata: {
      '721': {
        'test_peera_policy_000000000000000000000000000000000000000000000000000000': {
          [assetName]: {
            name: paper.title,
            description: paper.abstract,
            authors: paper.authors.map((a) => a.address),
            tags: paper.tags,
            review_mode: paper.reviewMode ?? 'Open',
            ipfs_cid: paper.ipfsHash,
            version: '1.0',
          },
        },
      },
    },
  };
  return sanitizeMetadata(raw) as MetadataForTx;
}

// ─── PaperDetailRoute ─────────────────────────────────────────────────────────

function PaperDetailRoute({
  papers,
  loading,
  reloadPapers,
  connected,
  walletAddress,
  walletName,
}: Readonly<{
  papers: Paper[];
  loading: boolean;
  reloadPapers: () => void;
  connected: boolean;
  walletAddress: string | null;
  walletName: string | null;
}>) {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  // Retry state lives here so it survives the user navigating away and back.
  const [retryingAnchor, setRetryingAnchor] = useState(false);
  // Guard against starting a second retry while one is already in flight,
  // even if the component remounts.
  const retryInFlightRef = useRef(false);

  // ── Fetch paper detail ───────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    if (!paperId) { setPaper(null); setDetailLoading(false); return; }

    setDetailLoading(true);
    api.getPaper(paperId).then((res) => {
      if (cancelled) return;
      setPaper(res.error || !res.data ? null : res.data);
      setDetailLoading(false);
    });

    return () => { cancelled = true; };
  }, [paperId]);

  // ── Keep detail in sync with background list polling ─────────────────────

  useEffect(() => {
    if (!paperId) return;
    const fromList = papers.find((entry) => entry.id === paperId);
    if (!fromList) return;
    setPaper((current) => {
      if (!current || current.id !== fromList.id) return current;
      const changed =
        current.views !== fromList.views ||
        current.confirmationStatus !== fromList.confirmationStatus ||
        current.status !== fromList.status ||
        current.txHash !== fromList.txHash ||
        current.mintStatus !== fromList.mintStatus ||
        current.mintAmount !== fromList.mintAmount ||
        current.mintTxHash !== fromList.mintTxHash;
      if (!changed) return current;
      return {
        ...current,
        views: fromList.views,
        confirmationStatus: fromList.confirmationStatus,
        status: fromList.status,
        txHash: fromList.txHash,
        mintStatus: fromList.mintStatus,
        mintAmount: fromList.mintAmount,
        mintTxHash: fromList.mintTxHash,
      };
    });
  }, [paperId, papers]);

  // ── Poll while confirmation is pending ───────────────────────────────────

  useEffect(() => {
    if (!paper?.confirmationStatus) return;
    if (!['pending_anchor', 'pending_confirmation'].includes(paper.confirmationStatus)) return;

    const interval = globalThis.setInterval(reloadPapers, 10000);
    return () => globalThis.clearInterval(interval);
  }, [paper?.confirmationStatus, reloadPapers]);

  // ── Retry anchor handler ─────────────────────────────────────────────────

  async function handleRetryAnchor() {
    if (retryInFlightRef.current) return; // already in flight
    if (!walletName || !walletAddress || !paper) return;

    retryInFlightRef.current = true;
    setRetryingAnchor(true);

    try {
      const rawMetadata = paper.metadataForTx ?? buildMetadataForPaper(paper);
      // Always sanitize — covers papers submitted before the 64-byte fix.
      const metadata = sanitizeMetadata(rawMetadata) as MetadataForTx;

      const txHash = await mintAnchorTx(walletName, walletAddress, metadata);

      // Tell the backend about the new tx so it can track confirmation.
      // Reuse the same confirmPaper call that useSubmitPaper makes.
      // We need a fresh nonce for the signature.
      const nonceRes = await api.getNonce(walletAddress);
      if (!nonceRes.error && nonceRes.data) {
        const { signNonce } = await import('./lib/cip30');
        const { nonce } = nonceRes.data;
        const sig = await signNonce(walletName, walletAddress, nonce);
        await api.confirmPaper(paper.ipfsHash, {
          txHash,
          walletAddress,
          nonce,
          signature: sig.signature,
          key: sig.key,
        });
      }

      // Immediately refresh so the badge flips to "Confirming".
      reloadPapers();

      // Optimistically update local paper state so the UI responds right away
      // without waiting for the next poll cycle.
      setPaper((prev) =>
        prev ? { ...prev, confirmationStatus: 'pending_confirmation', txHash } : prev
      );
    } finally {
      retryInFlightRef.current = false;
      setRetryingAnchor(false);
    }
  }

  // ── Render guards ────────────────────────────────────────────────────────

  if (loading || detailLoading) {
    return (
      <div className="pt-24 pb-20 max-w-3xl mx-auto px-6">
        <div className="p-8 border border-[color:var(--color-border)] bg-[color:var(--color-surface)] rounded-2xl text-center">
          <p className="text-zinc-500">Loading paper details...</p>
        </div>
      </div>
    );
  }

  if (!paper || !paperId) {
    return (
      <div className="pt-24 pb-20 max-w-3xl mx-auto px-6">
        <div className="p-8 border border-[color:var(--color-border)] bg-[color:var(--color-surface)] rounded-2xl text-center">
          <h1 className="text-2xl font-semibold mb-2">Paper not found</h1>
          <p className="text-zinc-500 mb-6">
            This paper ID does not exist in the current index.
          </p>
          <button
            onClick={() => navigate("/discover")}
            className="px-5 py-2.5 bg-[color:var(--color-primary)] text-white text-sm font-semibold rounded-lg"
          >
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  return (
    <PaperDetailPage
      paper={paper}
      reviews={MOCK_REVIEWS}
      connected={connected}
      walletAddress={walletAddress}
      walletName={walletName}
      retryingAnchor={retryingAnchor}
      onRetryAnchor={handleRetryAnchor}
    />
  );
}

// ─── Routing helpers ──────────────────────────────────────────────────────────

function getViewFromPath(pathname: string): View {
  if (pathname.startsWith("/discover")) return "discover";
  if (pathname.startsWith("/papers/")) return "detail";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/submit")) return "submit";
  if (pathname.startsWith("/reviewer")) return "reviewer";
  if (pathname.startsWith("/governance")) return "governance";
  return "landing";
}

function pathFromView(view: View): string {
  switch (view) {
    case "discover": return "/discover";
    case "profile":  return "/profile";
    case "submit":   return "/submit";
    case "reviewer": return "/reviewer";
    case "governance": return "/governance";
    case "detail":   return "/discover";
    default:         return "/";
  }
}