import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Navbar }          from './components/Navbar';
import { Footer }          from './components/Footer';
import { LandingPage }     from './pages/LandingPage';
import { DiscoverPage }    from './pages/DiscoverPage';
import { PaperDetailPage } from './pages/PaperDetailPage';
import { ProfilePage }     from './pages/ProfilePage';
import { SubmitPage }      from './pages/SubmitPage';
import { GovernancePage }  from './pages/GovernancePage';
import { usePapers } from './hooks/usePapers';
import { useWallet } from './hooks/useWallet';

import type { Paper, View } from './types';

type AvailableWallet = { id: string; name: string; icon: string };

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { papers, loading } = usePapers();
  const [wallets, setWallets] = useState<AvailableWallet[]>([]);
  const {
    connected,
    connecting,
    address,
    name,
    error,
    connect,
    disconnect,
    clearError,
    getAvailableWallets,
  } = useWallet();

  const view = getViewFromPath(location.pathname);

  useEffect(() => {
    let cancelled = false;
    getAvailableWallets()
      .then((entries) => {
        if (!cancelled) {
          setWallets(entries);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWallets([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [getAvailableWallets]);

  useEffect(() => {
    if (!error) return;
    const timeout = globalThis.setTimeout(() => {
      clearError();
    }, 6000);
    return () => {
      globalThis.clearTimeout(timeout);
    };
  }, [error, clearError]);

  return (
    <div className="min-h-screen bg-[color:var(--color-background)] flex flex-col">
      <Navbar
        activeView={view}
        setView={(next) => navigate(pathFromView(next))}
        walletAddress={address}
        walletName={name}
        wallets={wallets}
        connecting={connecting}
        walletError={error}
        onClearWalletError={clearError}
        onConnect={connect}
        onDisconnect={disconnect}
        connected={connected}
      />

      <main className="relative overflow-hidden flex-1">
        {/* Ambient glow on landing */}
        {location.pathname === '/' && (
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
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <Routes>
              <Route
                path="/"
                element={
                  <LandingPage
                    papers={papers}
                    loading={loading}
                    onExplore={() => navigate('/discover')}
                    onPublish={() => navigate('/submit')}
                  />
                }
              />
              <Route
                path="/discover"
                element={
                  <DiscoverPage
                    papers={papers}
                    loading={loading}
                    onSelectPaper={(paper) => navigate(`/papers/${paper.id}`)}
                  />
                }
              />
              <Route path="/papers/:paperId" element={<PaperDetailRoute papers={papers} loading={loading} />} />
              <Route
                path="/profile"
                element={
                  <ProfilePage
                    papers={papers}
                    connected={connected}
                    walletAddress={address}
                    walletName={name}
                    onPublish={() => navigate('/submit')}
                  />
                }
              />
              <Route path="/submit" element={<SubmitPage onComplete={() => navigate('/discover')} />} />
              <Route path="/governance" element={<GovernancePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

function PaperDetailRoute({ papers, loading }: Readonly<{ papers: Paper[]; loading: boolean }>) {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const paper = papers.find((entry) => entry.id === paperId);

  if (loading) {
    return (
      <div className="pt-24 pb-20 max-w-3xl mx-auto px-6">
        <div className="p-8 border border-[color:var(--color-border)] bg-[color:var(--color-surface)] rounded-2xl text-center">
          <p className="text-zinc-500">Loading paper details...</p>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="pt-24 pb-20 max-w-3xl mx-auto px-6">
        <div className="p-8 border border-[color:var(--color-border)] bg-[color:var(--color-surface)] rounded-2xl text-center">
          <h1 className="text-2xl font-semibold mb-2">Paper not found</h1>
          <p className="text-zinc-500 mb-6">This paper ID does not exist in the current index.</p>
          <button
            onClick={() => navigate('/discover')}
            className="px-5 py-2.5 bg-[color:var(--color-primary)] text-white text-sm font-semibold rounded-lg"
          >
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  return <PaperDetailPage paper={paper} reviews={[]} />;
}

function getViewFromPath(pathname: string): View {
  if (pathname.startsWith('/discover')) return 'discover';
  if (pathname.startsWith('/papers/')) return 'detail';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/submit')) return 'submit';
  if (pathname.startsWith('/governance')) return 'governance';
  return 'landing';
}

function pathFromView(view: View): string {
  switch (view) {
    case 'discover':
      return '/discover';
    case 'profile':
      return '/profile';
    case 'submit':
      return '/submit';
    case 'governance':
      return '/governance';
    case 'detail':
      return '/discover';
    default:
      return '/';
  }
}
