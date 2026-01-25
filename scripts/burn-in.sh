#!/bin/bash
# Burn-In Test Runner - Detects flaky tests by running multiple iterations
#
# Usage: ./scripts/burn-in.sh [iterations] [base-branch]
#
# Validates test stability with timing metrics.
# Default: 10 iterations for flakiness validation.
#
# Example:
#   ./scripts/burn-in.sh           # 10 iterations, changed tests only
#   ./scripts/burn-in.sh 5         # 5 iterations, changed tests only
#   ./scripts/burn-in.sh 10 main   # 10 iterations, compare to main branch

set -e

# Configuration
ITERATIONS=${1:-10}
BASE_BRANCH=${2:-main}
SPEC_PATTERN='\.(spec|test)\.(ts|js)$'
RESULTS_FILE=".build/burn-in-results.json"

echo "========================================"
echo "  Burn-In Test Runner"
echo "========================================"
echo "Iterations: $ITERATIONS"
echo "Base branch: $BASE_BRANCH"
echo ""

# Ensure .build directory exists
mkdir -p .build

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

# Initialize timing arrays
declare -a DURATIONS
TOTAL_START=$(date +%s)
PASSED=0
FAILED=0

# Burn-in loop
for i in $(seq 1 "$ITERATIONS"); do
  echo "=========================================="
  echo "  Burn-in iteration $i/$ITERATIONS"
  echo "=========================================="

  ITER_START=$(date +%s)

  if [ "$RUN_ALL" = true ]; then
    if bun run test:e2e:ci 2>&1; then
      ITER_END=$(date +%s)
      DURATION=$((ITER_END - ITER_START))
      DURATIONS+=($DURATION)
      PASSED=$((PASSED + 1))
      echo "Iteration $i passed (${DURATION}s)"
    else
      ITER_END=$(date +%s)
      DURATION=$((ITER_END - ITER_START))
      DURATIONS+=($DURATION)
      FAILED=$((FAILED + 1))
      echo ""
      echo "BURN-IN FAILED on iteration $i (${DURATION}s)"
      echo "Test suite is flaky - investigate before merging"
      # Continue to collect more data points
    fi
  else
    if bun run test:e2e:ci -- $CHANGED_SPECS 2>&1; then
      ITER_END=$(date +%s)
      DURATION=$((ITER_END - ITER_START))
      DURATIONS+=($DURATION)
      PASSED=$((PASSED + 1))
      echo "Iteration $i passed (${DURATION}s)"
    else
      ITER_END=$(date +%s)
      DURATION=$((ITER_END - ITER_START))
      DURATIONS+=($DURATION)
      FAILED=$((FAILED + 1))
      echo ""
      echo "BURN-IN FAILED on iteration $i (${DURATION}s)"
      # Continue to collect more data points
    fi
  fi

  echo ""
done

TOTAL_END=$(date +%s)
TOTAL_DURATION=$((TOTAL_END - TOTAL_START))

# Calculate statistics
if [ ${#DURATIONS[@]} -gt 0 ]; then
  MIN=${DURATIONS[0]}
  MAX=${DURATIONS[0]}
  SUM=0
  for d in "${DURATIONS[@]}"; do
    SUM=$((SUM + d))
    [ $d -lt $MIN ] && MIN=$d
    [ $d -gt $MAX ] && MAX=$d
  done
  AVG=$((SUM / ${#DURATIONS[@]}))
else
  MIN=0
  MAX=0
  AVG=0
fi

# Calculate flakiness rate (using awk for portable float math)
FLAKINESS_RATE=$(awk "BEGIN {printf \"%.2f\", $FAILED * 100 / $ITERATIONS}")

echo "=========================================="
echo "  BURN-IN SUMMARY"
echo "=========================================="
echo "Iterations: $ITERATIONS"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Flakiness Rate: ${FLAKINESS_RATE}%"
echo ""
echo "Timing:"
echo "  Min: ${MIN}s"
echo "  Max: ${MAX}s"
echo "  Avg: ${AVG}s"
echo "  Total: ${TOTAL_DURATION}s"
echo ""

# Write results to JSON for CI consumption
cat > "$RESULTS_FILE" << EOF
{
  "iterations": $ITERATIONS,
  "passed": $PASSED,
  "failed": $FAILED,
  "flakiness_rate": $FLAKINESS_RATE,
  "timing": {
    "min_seconds": $MIN,
    "max_seconds": $MAX,
    "avg_seconds": $AVG,
    "total_seconds": $TOTAL_DURATION
  },
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
echo "Results written to: $RESULTS_FILE"
echo ""

# Determine exit status
# Story 0-8 AC5: Flakiness rate must be <2% (0-1 failures out of 10)
# For merge quality, we enforce 0% threshold locally
if [ $FAILED -gt 0 ]; then
  echo "BURN-IN FAILED"
  echo "Flakiness rate ${FLAKINESS_RATE}% - AC5 threshold is <2%, merge threshold is 0%"
  exit 1
else
  echo "BURN-IN PASSED"
  echo "All $ITERATIONS iterations passed - tests are stable"
  exit 0
fi
