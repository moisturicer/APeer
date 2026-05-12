import { useState } from 'react';
import { Library, Globe, PlusCircle, Gavel, ShieldCheck, X } from 'lucide-react';
import type { View } from '../types';

type AvailableWallet = { id: string; name: string; icon: string };

interface NavbarProps {
  activeView: View;
  setView: (v: View) => void;
  connected: boolean;
  connecting: boolean;
  walletAddress: string | null;
  wallets: AvailableWallet[];
  walletError: string | null;
  onClearWalletError: () => void;
  onConnect: (walletId: string) => Promise<void>;
  onDisconnect: () => void;
  reviewOpportunitiesCount?: number;
}

export function Navbar({
  activeView,
  setView,
  connected,
  connecting,
  walletAddress,
  wallets,
  walletError,
  onClearWalletError,
  onConnect,
  onDisconnect,
  reviewOpportunitiesCount = 0,
}: Readonly<NavbarProps>) {
  const [showWallets, setShowWallets] = useState(false);

  const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '';

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-[color:var(--color-surface)] border-b border-[color:var(--color-border)] z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <button
          onClick={() => setView('landing')}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-md bg-[color:var(--color-primary)] flex items-center justify-center">
            <Library className="text-white w-5 h-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-[color:var(--color-primary)]">APeer</span>
        </button>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { id: 'discover',    label: 'Discover',    icon: Globe },
            { id: 'submit',      label: 'Publish',     icon: PlusCircle },
            { id: 'reviewer',    label: 'Reviewer',    icon: ShieldCheck },
            { id: 'governance',  label: 'Governance',  icon: Gavel },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors relative ${
                activeView === item.id
                  ? 'text-[color:var(--color-primary)]'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {item.label}
              {item.id === 'reviewer' && reviewOpportunitiesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {reviewOpportunitiesCount > 9 ? '9+' : reviewOpportunitiesCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Wallet */}
      <div className="relative flex flex-col items-end gap-1 max-w-[360px]">
        <div className="flex items-center gap-3">
        {connected && walletAddress ? (
          <>
            <button
              onClick={() => setView('profile')}
              className="flex items-center gap-3 px-4 py-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-background)] hover:bg-zinc-50 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center text-[10px] font-mono">
                ID
              </div>
              <span className="text-sm font-mono text-zinc-600">{shortAddress}</span>
              <div className="h-4 w-px bg-[color:var(--color-border)]" />
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-[color:var(--color-accent)] flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold leading-none">P</span>
                </div>
                <span className="text-sm font-semibold">Connected</span>
              </div>
            </button>
            <button
              onClick={onDisconnect}
              className="px-3 py-2 text-xs font-semibold rounded-full border border-[color:var(--color-border)] text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowWallets((current) => !current)}
              disabled={connecting}
              className="px-5 py-2 bg-[color:var(--color-primary)] text-white text-sm font-medium rounded-full hover:bg-[color:var(--color-primary-light)] transition-all shadow-sm disabled:opacity-60"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            {showWallets && (
              <div className="absolute right-0 top-12 w-64 rounded-xl border border-[color:var(--color-border)] bg-white shadow-lg p-2">
                {wallets.length > 0 ? (
                  wallets.map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => {
                        void onConnect(wallet.id);
                        setShowWallets(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-50 text-sm text-zinc-700 flex items-center gap-2"
                    >
                      {wallet.icon ? <img src={wallet.icon} alt="" className="w-4 h-4" /> : null}
                      <span>{wallet.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-zinc-500">
                    No Cardano wallet detected. Install Eternl, Nami, or Lace.
                  </div>
                )}
              </div>
            )}
          </>
        )}
        </div>

        {walletError && (
          <div className="max-w-full flex items-start gap-2 text-right text-[11px] leading-4 text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1">
            <p className="break-words">{walletError}</p>
            <button
              type="button"
              onClick={onClearWalletError}
              className="shrink-0 mt-0.5 text-red-500 hover:text-red-700 transition-colors"
              aria-label="Dismiss wallet error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
