#!/usr/bin/env bash
# scripts/bootstrap.sh
# Run once after cloning the repo to set up your local environment.
# Usage: bash scripts/bootstrap.sh

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  APeer — Local Environment Bootstrap"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Check Bun ────────────────────────────────
if ! command -v bun &> /dev/null; then
  echo "❌  Bun is not installed."
  echo "    Install it from: https://bun.sh"
  echo "    macOS / Linux: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

BUN_VERSION=$(bun --version)
echo "✅  Bun $BUN_VERSION detected"

# ── 2. Install dependencies ─────────────────────
echo ""
echo "📦  Installing dependencies..."
bun install

# ── 3. Copy .env files ──────────────────────────
echo ""
if [ ! -f "server/.env" ]; then
  cp server/.env.example server/.env
  echo "📄  Created server/.env from .env.example"
  echo "    ⚠️  Open server/.env and add your Blockfrost preprod API key!"
  echo "    Get one free at: https://blockfrost.io"
else
  echo "📄  server/.env already exists — skipping"
fi

# ── 4. Done ─────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Bootstrap complete!"
echo ""
echo "  Next steps:"
echo "    1. Add your Blockfrost key to server/.env"
echo "    2. bun run dev:server   → start API server (port 3000)"
echo "    3. bun run dev:client   → start React app  (port 5173)"
echo "    4. bun run dev          → start both together"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
