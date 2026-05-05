#!/usr/bin/env bun
/**
 * Quick Blockfrost API connectivity test
 */
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

const API_KEY = process.env.BLOCKFROST_PROJECT_ID || 'preprodYOUR_KEY_HERE';
const blockfrost = new BlockFrostAPI({ projectId: API_KEY, network: 'preprod' });

async function main() {
  console.log('🔍 Testing Blockfrost Preprod Connection...\n');
  
  if (API_KEY === 'preprodYOUR_KEY_HERE') {
    console.error('❌ Set BLOCKFROST_PROJECT_ID environment variable');
    console.error('   export BLOCKFROST_PROJECT_ID=preprod123abc...');
    process.exit(1);
  }

  try {
    // Test 1: Health Check
    const health = await blockfrost.health();
    console.log('✅ API Health:', health.is_healthy ? 'OK' : 'ERROR');
    
    // Test 2: Latest Block
    const latest = await blockfrost.blocksLatest();
    console.log('✅ Latest Block:', latest.height);
    console.log('   Hash:', latest.hash);
    console.log('   Time:', new Date(latest.time * 1000).toISOString());
    
    // Test 3: Network Stats
    const network = await blockfrost.network();
    const totalADA = parseInt(network.supply.total) / 1_000_000;
    console.log('✅ Network:', network.network);
    console.log('   Total ADA:', totalADA.toLocaleString());
    
    // Test 4: Protocol Parameters
    const params = await blockfrost.epochsLatestParameters();
    console.log('✅ Protocol Params:');
    console.log('   Min Fee:', `${params.min_fee_a} + ${params.min_fee_b}`);
    console.log('   Max TX Size:', params.max_tx_size, 'bytes');
    
    console.log('\n🎉 All tests passed! Blockfrost connection working.\n');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.status_code === 403) {
      console.error('   → Check your API key is for preprod network');
    }
    process.exit(1);
  }
}

main();