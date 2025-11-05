#!/bin/bash
# One-time Doppler CLI setup script
# Links local Doppler CLI install to shared service token for the project
# Secrets are already configured in Doppler - this just authenticates CLI

set -e

export HISTFILE=/dev/null
set +o history

echo "Setting up Doppler CLI..."

if ! command -v doppler &> /dev/null; then
  echo "Doppler CLI not found. Attempting to install..."
  curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh
fi

if [ -f ".doppler.yaml" ] && doppler configure get project &> /dev/null; then
  if doppler secrets --only-names &> /dev/null; then
    echo "Doppler CLI already linked and authenticated"
    doppler configure
    exit 0
  else
    echo "Doppler CLI configured but not authenticated. Re-linking..."
  fi
fi

if [ -n "$DOPPLER_TOKEN" ]; then
  echo "Using DOPPLER_TOKEN from environment"
  SERVICE_TOKEN="$DOPPLER_TOKEN"
elif [ -f ".doppler.token" ]; then
  echo "Using .doppler.token file"
  SERVICE_TOKEN=$(cat .doppler.token)
else
  echo "Service token required"
  echo ""
  echo "Get the shared service token from team"
  read -sp "Enter service token (hidden): " SERVICE_TOKEN
  echo ""
  
  if [ -z "$SERVICE_TOKEN" ]; then
    echo "No token provided. Exiting."
    echo ""
    echo "Set token using:"
    echo "  1. export DOPPLER_TOKEN='dp.st.dev.xxxx'"
    echo "  2. Create .doppler.token file with the token"
    exit 1
  fi
fi

echo "Linking Doppler CLI to project"
HISTCONTROL=ignorespace doppler setup -t "$SERVICE_TOKEN" --no-interactive

echo "Doppler CLI linked successfully"
echo ""
doppler configure
