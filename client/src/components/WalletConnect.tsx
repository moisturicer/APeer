import { useState, useEffect } from 'react'
import { useWallet } from '@/hooks/useWallet'

export function WalletConnect() {
  const { connected, connecting, address, name, error, connect, disconnect, getAvailableWallets } = useWallet()
  const [wallets, setWallets] = useState<{ id: string; name: string; icon: string }[]>([])
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    getAvailableWallets().then(setWallets)
  }, [getAvailableWallets])

  const short = address ? `${address.slice(0, 8)}…${address.slice(-6)}` : ''

  if (connected) {
    return (
      <div className="wallet-connected">
        <span className="wallet-badge">
          <span className="wallet-dot" />
          {name} · {short}
        </span>
        <button className="btn btn-ghost" onClick={disconnect}>Disconnect</button>
      </div>
    )
  }

  return (
    <div className="wallet-picker-wrap">
      <button
        className="btn btn-primary"
        onClick={() => setShowPicker(p => !p)}
        disabled={connecting}
      >
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </button>

      {showPicker && wallets.length > 0 && (
        <div className="wallet-dropdown">
          {wallets.map(w => (
            <button
              key={w.id}
              className="wallet-option"
              onClick={() => { connect(w.id); setShowPicker(false) }}
            >
              {w.icon && <img src={w.icon} alt="" width={20} height={20} />}
              {w.name}
            </button>
          ))}
        </div>
      )}

      {showPicker && wallets.length === 0 && (
        <div className="wallet-dropdown">
          <p className="wallet-none">No Cardano wallets detected.<br />Install Eternl, Nami, or Lace.</p>
        </div>
      )}

      {error && <p className="wallet-error">{error}</p>}
    </div>
  )
}
