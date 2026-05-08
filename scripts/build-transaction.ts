#!/usr/bin/env bun
import 'dotenv/config'; // Load .env file
import { MeshWallet, Transaction } from '@meshsdk/core';
import { BlockfrostProvider } from '@meshsdk/core';

const API_KEY = process.env.BLOCKFROST_PROJECT_ID;
const MNEMONIC = process.env.WALLET_MNEMONIC;
const RECIPIENT = process.env.RECIPIENT_ADDRESS;
const AMOUNT_LOVELACE = process.env.AMOUNT_LOVELACE || '1000000';

// Validation
if (!API_KEY || !MNEMONIC || !RECIPIENT) {
  console.error('❌ Missing environment variables. Check your .env file.\n');
  if (!API_KEY) console.error('  Missing: BLOCKFROST_PROJECT_ID');
  if (!MNEMONIC) console.error('  Missing: WALLET_MNEMONIC');
  if (!RECIPIENT) console.error('  Missing: RECIPIENT_ADDRESS');
  process.exit(1);
}

// Parse mnemonic properly
const words = MNEMONIC
  .trim()
  .toLowerCase()
  .replace(/[,\n\r]+/g, ' ') // Replace commas/newlines with spaces
  .split(/\s+/) // Split by whitespace
  .filter(w => w.length > 0); // Remove empty strings

if (![12, 15, 18, 21, 24].includes(words.length)) {
  console.error(`❌ Invalid mnemonic: ${words.length} words (need 12/15/18/21/24)`);
  process.exit(1);
}

console.log('✅ Mnemonic valid:', words.length, 'words\n');

async function sendTransaction() {
  console.log('🔄 Building Transaction...\n');
  
  try {
    const provider = new BlockfrostProvider(API_KEY!);
    
    const wallet = new MeshWallet({
        networkId: API_KEY!.startsWith('preprod') ? 0 : 1,
        fetcher: provider,  
        submitter: provider,
        key: { type: 'mnemonic', words },
    });
    
    const sender = wallet.getChangeAddress();
    console.log('From:', sender);
    console.log('To:  ', RECIPIENT);
    console.log('Amount:', parseInt(AMOUNT_LOVELACE) / 1_000_000, 'ADA\n');
    
    const tx = new Transaction({ initiator: wallet })
      .sendLovelace(RECIPIENT!, AMOUNT_LOVELACE);
    
    console.log('📝 Building...');
    const unsignedTx = await tx.build();
    
    console.log('✍️  Signing...');
    const signedTx = await wallet.signTx(unsignedTx);
    
    console.log('📤 Submitting...');
    const txHash = await wallet.submitTx(signedTx);
    
    console.log('\n✅ Success!');
    console.log('TX Hash:', txHash);
    console.log('Explorer: https://preprod.cardanoscan.io/transaction/' + txHash);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('Insufficient')) {
      console.error('→ Not enough ADA. Get test ADA from faucet:');
      console.error('  https://docs.cardano.org/cardano-testnet/tools/faucet');
    }
  }
}

sendTransaction();