#!/bin/bash
# scripts/check-env-parity.sh
#
# Validates that critical environment variables are set.
# Run this before deployment to ensure environment parity.
#
# Usage: ./scripts/check-env-parity.sh
#
# Required environment variables:
# - SESSION_SECRET: Required for session cookie encryption (32+ characters)
#
# Optional environment variables:
# - VITE_USE_EMULATORS: Set to 'true' for local/test environments

set -e

echo "Checking environment parity..."

# Required variables
REQUIRED_VARS=("SESSION_SECRET")

# Check each required variable
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "ERROR: $var is not set"
    exit 1
  fi

  # Additional validation for SESSION_SECRET length
  if [ "$var" == "SESSION_SECRET" ]; then
    len=${#SESSION_SECRET}
    if [ "$len" -lt 32 ]; then
      echo "ERROR: SESSION_SECRET must be at least 32 characters"
      exit 1
    fi
  fi
done

echo "Environment parity check passed"
echo "  SESSION_SECRET: set"

# Optional: Check for emulator mode
if [ -n "$VITE_USE_EMULATORS" ]; then
  echo "  VITE_USE_EMULATORS: $VITE_USE_EMULATORS"
fi

exit 0
