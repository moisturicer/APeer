import { useState } from "react";
import { BrowserWallet, Transaction } from "@meshsdk/core";

export function TestTransaction() {
  const [status, setStatus] = useState("Ready to test!");
  const [hash, setHash] = useState("");

  const executeTransaction = async () => {
    try {
      setHash("");
      setStatus("🔌 Connecting to Lace...");

      // 1. Connect directly to the user's Lace wallet extension
      const wallet = await BrowserWallet.enable("lace");
      const myAddress = await wallet.getChangeAddress();

      setStatus("🔨 Building transaction...");

      // 2. Build a transaction sending 2 tADA back to yourself
      const tx = new Transaction({ initiator: wallet }).sendLovelace(
        myAddress,
        "2000000", // 2 tADA
      );

      const unsignedTx = await tx.build();

      setStatus("✍️ Please type your spending password in the Lace popup...");

      // 3. Ask the user to sign it (triggers the Lace UI)
      const signedTx = await wallet.signTx(unsignedTx);

      setStatus("🚀 Submitting to the Preprod blockchain...");

      // 4. Submit to the network!
      const txHash = await wallet.submitTx(signedTx);

      setHash(txHash);
      setStatus("🎉 TRANSACTION SUCCESSFUL! 🎉");
    } catch (error: any) {
      console.error(error);
      setStatus(`❌ Failed: ${error.message || "Check console for details"}`);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto mt-20 bg-white rounded-xl shadow-lg border border-zinc-200 text-center">
      <h2 className="text-2xl font-semibold mb-4 text-zinc-800">
        Cardano Transaction Test
      </h2>

      <button
        onClick={executeTransaction}
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors mb-6 shadow-md"
      >
        Send 2 tADA
      </button>

      <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-100 text-zinc-700 font-mono text-sm">
        <p className="mb-2 font-semibold">{status}</p>

        {hash && (
          <div className="mt-4 pt-4 border-t border-zinc-200">
            <p className="text-xs text-zinc-500 mb-1">Transaction Hash:</p>
            <p className="break-all text-blue-600 mb-2">{hash}</p>
            <a
              href={`https://preprod.cardanoscan.io/transaction/${hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 bg-zinc-800 text-white rounded hover:bg-zinc-900 transition-colors text-xs"
            >
              View on Cardanoscan
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
