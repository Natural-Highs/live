#!/bin/bash
# Local CI Mirror - Run the same checks locally as GitHub Actions
# Usage: ./scripts/ci-local.sh [--skip-e2e] [--burn-in]

set -e

SKIP_E2E=false
RUN_BURN_IN=false

for arg in "$@"; do
  case $arg in
    --skip-e2e)
      SKIP_E2E=true
      shift
      ;;
    --burn-in)
      RUN_BURN_IN=true
      shift
      ;;
  esac
done

echo "========================================"
echo "  Local CI Pipeline"
echo "========================================"
echo ""

# Stage 1: Code Quality
echo "Stage 1/4: Code Quality (Trunk Check)"
echo "----------------------------------------"
if command -v trunk &> /dev/null; then
  trunk check --ci || {
    echo "Trunk check failed"
    exit 1
  }
else
  echo "Trunk not installed, running Biome..."
  bun run lint:biome || exit 1
fi
echo "Code quality passed"
echo ""

# Stage 2: Type Check
echo "Stage 2/4: Type Check"
echo "----------------------------------------"
bun run lint:tsc || {
  echo "Type check failed"
  exit 1
}
echo "Type check passed"
echo ""

# Stage 3: Unit Tests
echo "Stage 3/4: Unit Tests"
echo "----------------------------------------"
bun run test:ci || {
  echo "Unit tests failed"
  exit 1
}
echo "Unit tests passed"
echo ""

# Stage 4: E2E Tests
if [ "$SKIP_E2E" = false ]; then
  echo "Stage 4/4: E2E Tests"
  echo "----------------------------------------"

  # Check if emulators are running
  if ! curl -s http://localhost:9099 > /dev/null 2>&1; then
    echo "Starting Firebase emulators..."
    firebase emulators:start --only auth,firestore --project demo-natural-highs &
    for i in {1..30}; do
      if curl -s http://localhost:9099 > /dev/null 2>&1; then
        echo "Emulators ready"
        break
      fi
      echo "Waiting for emulators... ($i/30)"
      sleep 1
    done
    sleep 2
  fi

  VITE_USE_EMULATORS=true VITE_APIKEY=demo-test-key VITE_AUTH_DOMAIN=localhost \
  VITE_PROJECT_ID=demo-natural-highs VITE_STORAGE_BUCKET=demo-natural-highs.appspot.com \
  VITE_MESSAGING_SENDER_ID=000000000000 VITE_APP_ID=demo-app-id \
  bun run test:e2e:ci || {
    echo "E2E tests failed"
    exit 1
  }
  echo "E2E tests passed"
  echo ""

  # Optional burn-in
  if [ "$RUN_BURN_IN" = true ]; then
    echo "Stage 5: Burn-In (3 iterations)"
    echo "----------------------------------------"
    ./scripts/burn-in.sh 3 || {
      echo "Burn-in failed - tests are flaky"
      exit 1
    }
  fi
else
  echo "Stage 4/4: E2E Tests (SKIPPED)"
  echo "----------------------------------------"
  echo "Use --skip-e2e to skip E2E tests"
fi

echo ""
echo "========================================"
echo "  LOCAL CI PASSED"
echo "========================================"
echo ""
echo "All checks passed. Ready to push."
exit 0
