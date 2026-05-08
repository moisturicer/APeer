#!/usr/bin/env bun
/**
 * Test wallet address queries
 * Replace WALLET_ADDRESS with your preprod wallet address
 */
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

const API_KEY = process.env.BLOCKFROST_PROJECT_ID!;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS 

const blockfrost = new BlockFrostAPI({ projectId: API_KEY, network: 'preprod' });

async function queryWallet(address: string) {
  console.log('🔍 Querying Wallet:', address, '\n');
  
  try {
    // Get address info
    const addrInfo = await blockfrost.addresses(address);
    const balance = parseInt(addrInfo.amount[0]?.quantity || '0') / 1_000_000;
    
    console.log('✅ Address Type:', addrInfo.type);
    console.log('✅ Balance:', balance.toFixed(6), 'ADA');
    console.log('✅ Stake Address:', addrInfo.stake_address || 'None');
    
    // Get UTXOs
    const utxos = await blockfrost.addressesUtxos(address);
    console.log('✅ UTXOs:', utxos.length);
    
    if (utxos.length > 0) {
      console.log('\nSample UTXO:');
      console.log('  TX Hash:', utxos[0].tx_hash);
      console.log('  Output Index:', utxos[0].output_index);
      console.log('  Amount:', (parseInt(utxos[0].amount[0].quantity) / 1_000_000).toFixed(6), 'ADA');
    }
    
    // Check for native tokens
    if (addrInfo.amount.length > 1) {
      console.log('\n✅ Native Tokens:', addrInfo.amount.length - 1);
      addrInfo.amount.slice(1, 4).forEach(token => {
        console.log(`  • ${token.unit.substring(0, 16)}...: ${token.quantity}`);
      });
    }
    
    console.log('\n✅ Wallet query successful!\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.status_code === 404) {
      console.error('   → Address not found or has no transactions');
      console.error('   → Get test ADA: https://docs.cardano.org/cardano-testnet/tools/faucet');
    }
  }
}

if (!API_KEY || API_KEY === 'preprodYOUR_KEY_HERE') {
  console.error('❌ Set BLOCKFROST_PROJECT_ID environment variable');
  process.exit(1);
}

if (WALLET_ADDRESS === 'addr_test1...') {
  console.error('❌ Set WALLET_ADDRESS environment variable or replace in script');
  console.error('   export WALLET_ADDRESS=addr_test1...');
  process.exit(1);
}

queryWallet(WALLET_ADDRESS);