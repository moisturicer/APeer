import { BlockfrostProvider, AppWallet, Transaction } from '@meshsdk/core';

// Ensure the environment variable is loaded (Bun does this automatically from .env)
const PROJECT_ID = process.env.BLOCKFROST_PROJECT_ID;

async function runTest() {
  if (!PROJECT_ID) throw new Error("Missing BLOCKFROST_PROJECT_ID in .env");

  console.log("🔌 Connecting to Preprod via Blockfrost...");
  const provider = new BlockfrostProvider(PROJECT_ID);

  // Initialize the wallet using your Lace 24-word recovery phrase
  const wallet = new AppWallet({
    networkId: 0, // 0 = Testnet (Preprod), 1 = Mainnet
    fetcher: provider,
    submitter: provider,
    key: {
      type: 'mnemonic',
      words: [
        'kitten', 'scale', 'evoke', 'develop', 'farm', 'rough',
        'quote', 'hover', 'illegal', 'maze', 'arch', 'analyst',
        'else', 'pupil', 'run', 'gorilla', 'bounce', 'input',
        'siege', 'ghost', 'animal', 'word', 'again', 'general'
      ], // ⚠️ REPLACE THIS ARRAY WITH YOUR LACE RECOVERY PHRASE
    },
  });

  const senderAddress = wallet.getPaymentAddress();
  console.log(`✅ Wallet loaded! Address: ${senderAddress}`);

  // We will just send 2 tADA back to your own address for testing purposes!
  const receiverAddress = senderAddress; 

  console.log("🔨 Building transaction (Sending 2 tADA)...");
  const tx = new Transaction({ initiator: wallet }).sendLovelace(
    receiverAddress,
    '2000000' // 2 tADA in Lovelace (1 ADA = 1,000,000 Lovelace)
  );

  try {
    const unsignedTx = await tx.build();
    console.log("✍️ Signing transaction...");
    const signedTx = await wallet.signTx(unsignedTx);
    
    console.log("🚀 Submitting to the Preprod blockchain...");
    const txHash = await wallet.submitTx(signedTx);

    console.log("\n🎉 TRANSACTION SUBMITTED SUCCESSFULLY! 🎉");
    console.log(`🔗 Track it on Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);
    
  } catch (error) {
    console.error("\n❌ Transaction failed:", error);
  }
}

runTest();