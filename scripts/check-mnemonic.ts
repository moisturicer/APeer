#!/usr/bin/env bun
const MNEMONIC = process.env.WALLET_MNEMONIC;

console.log('🔍 Mnemonic Diagnostic\n');

if (!MNEMONIC) {
  console.error('❌ WALLET_MNEMONIC not set');
  process.exit(1);
}

const words = MNEMONIC.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);

console.log('Word count:', words.length);
console.log('Valid?', [12, 15, 18, 21, 24].includes(words.length) ? '✅ YES' : '❌ NO');
console.log('First 3 words:', words.slice(0, 3).join(' '));
console.log('Last 3 words:', words.slice(-3).join(' '));

// Check for issues
if (MNEMONIC.includes(',')) console.log('❌ Remove commas, use spaces');
if (MNEMONIC.includes('"')) console.log('❌ Remove quotes');
if (words.some(w => /[^a-z]/.test(w))) console.log('❌ Non-alphabetic characters found');