#!/bin/bash
# Development server with Firebase emulators
#
# Starts emulators and dev server concurrently.
# Waits for emulators to be ready before starting vite.

set -e

# Check required dependencies
command -v concurrently >/dev/null 2>&1 || { echo "Error: concurrently not installed. Run: bun install"; exit 1; }
command -v firebase >/dev/null 2>&1 || { echo "Error: firebase-tools not installed. Run: bun add -g firebase-tools"; exit 1; }

# Cleanup on exit/interrupt
cleanup() {
  echo "Stopping background jobs..."
  local pids
  pids=$(jobs -p)
  if [ -n "$pids" ]; then
    for pid in $pids; do
      kill "$pid" 2>/dev/null || true
    done
    for pid in $pids; do
      wait "$pid" 2>/dev/null || true
    done
  fi
}
trap cleanup EXIT SIGINT SIGTERM

# Environment variables for emulator mode
export VITE_USE_EMULATORS=true
export USE_EMULATORS=true
export VITE_PROJECT_ID=demo-natural-highs
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8180
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
# Session secret for iron-webcrypto (32+ chars required, matches playwright.config.ts)
export SESSION_SECRET=test-session-secret-32-characters-minimum-length-for-iron-webcrypto

# Start emulators and dev server concurrently
# -n: name prefixes for output
# -c: colors for each process
concurrently -n emu,dev -c blue,green \
  "firebase emulators:start" \
  "wait-on tcp:8180 tcp:9099 && vite"
