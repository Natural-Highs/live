#!/bin/bash
# Burn-In Test Runner - Detects flaky tests by running multiple iterations
# Usage: ./scripts/burn-in.sh [iterations] [base-branch]

set -e

# Configuration
ITERATIONS=${1:-5}
BASE_BRANCH=${2:-main}
SPEC_PATTERN='\.(spec|test)\.(ts|js)$'

echo "========================================"
echo "  Burn-In Test Runner"
echo "========================================"
echo "Iterations: $ITERATIONS"
echo "Base branch: $BASE_BRANCH"
echo ""

# Detect changed test files
echo "Detecting changed test files..."
CHANGED_SPECS=$(git diff --name-only "$BASE_BRANCH"...HEAD 2>/dev/null | grep -E "$SPEC_PATTERN" || echo "")

if [ -z "$CHANGED_SPECS" ]; then
  echo "No test files changed. Running full suite burn-in..."
  CHANGED_SPECS=""
  RUN_ALL=true
else
  RUN_ALL=false
  echo "Changed test files:"
  echo "$CHANGED_SPECS" | sed 's/^/  - /'
  SPEC_COUNT=$(echo "$CHANGED_SPECS" | wc -l | xargs)
  echo ""
  echo "Running burn-in on $SPEC_COUNT test file(s)..."
fi

echo ""

# Burn-in loop
for i in $(seq 1 "$ITERATIONS"); do
  echo "=========================================="
  echo "  Burn-in iteration $i/$ITERATIONS"
  echo "=========================================="

  if [ "$RUN_ALL" = true ]; then
    if bun run test:e2e:ci; then
      echo "Iteration $i passed"
    else
      echo ""
      echo "BURN-IN FAILED on iteration $i"
      echo "Test suite is flaky - investigate before merging"
      exit 1
    fi
  else
    if bun run test:e2e:ci -- $CHANGED_SPECS; then
      echo "Iteration $i passed"
    else
      echo ""
      echo "BURN-IN FAILED on iteration $i"
      echo "Tests are flaky - investigate before merging"
      exit 1
    fi
  fi

  echo ""
done

echo "=========================================="
echo "  BURN-IN PASSED"
echo "=========================================="
echo "All $ITERATIONS iterations passed"
echo "Tests are stable and ready to merge"
exit 0
