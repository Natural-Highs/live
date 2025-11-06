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
elif [ -n "$DOPPLER_GIST_ID" ]; then
  echo "Fetching Doppler token from GitHub Gist..."
  GIST_URL="https://gist.githubusercontent.com/${DOPPLER_GIST_USER:-anonymous}/${DOPPLER_GIST_ID}/raw"
  if [ -n "$DOPPLER_GIST_FILE" ]; then
    GIST_URL="${GIST_URL}/${DOPPLER_GIST_FILE}"
  fi
    # Try to extract token - handle both formats:
    # 1. DOPPLER_TOKEN=dp.st.dev.xxx
    # 2. Just the token: dp.st.dev.xxx
    GIST_CONTENT=$(curl -sLf --retry 3 --tlsv1.2 --proto "=https" "$GIST_URL")
    SERVICE_TOKEN=$(echo "$GIST_CONTENT" | grep -E "^DOPPLER_TOKEN=" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
    if [ -z "$SERVICE_TOKEN" ]; then
      SERVICE_TOKEN=$(echo "$GIST_CONTENT" | grep -E "^DOPPLER_TOKEN" | cut -d'=' -f2- | tr -d ' ' | xargs)
    fi
    # If still empty, assume the file contains just the token
    if [ -z "$SERVICE_TOKEN" ]; then
      SERVICE_TOKEN=$(echo "$GIST_CONTENT" | head -n1 | tr -d ' ' | xargs)
    fi
    if [ -z "$SERVICE_TOKEN" ] || [[ ! "$SERVICE_TOKEN" =~ ^dp\. ]]; then
      echo "Error: Could not extract valid DOPPLER_TOKEN from Gist"
      echo "Expected format: DOPPLER_TOKEN=dp.st.dev.xxx or just dp.st.dev.xxx"
      exit 1
    fi
  echo "Token fetched from Gist successfully"
elif [ -f ".doppler.gist" ]; then
  echo "Reading Gist configuration from .doppler.gist"
  GIST_ID=$(grep -E "^GIST_ID=" .doppler.gist | cut -d'=' -f2- | xargs)
  GIST_USER=$(grep -E "^GIST_USER=" .doppler.gist | cut -d'=' -f2- | xargs)
  GIST_FILE=$(grep -E "^GIST_FILE=" .doppler.gist | cut -d'=' -f2- | xargs)
  if [ -n "$GIST_ID" ]; then
    GIST_URL="https://gist.githubusercontent.com/${GIST_USER:-anonymous}/${GIST_ID}/raw"
    if [ -n "$GIST_FILE" ]; then
      GIST_URL="${GIST_URL}/${GIST_FILE}"
    fi
    # Try to extract token - handle both formats:
    # 1. DOPPLER_TOKEN=dp.st.dev.xxx
    # 2. Just the token: dp.st.dev.xxx
    GIST_CONTENT=$(curl -sLf --retry 3 --tlsv1.2 --proto "=https" "$GIST_URL")
    SERVICE_TOKEN=$(echo "$GIST_CONTENT" | grep -E "^DOPPLER_TOKEN=" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
    if [ -z "$SERVICE_TOKEN" ]; then
      SERVICE_TOKEN=$(echo "$GIST_CONTENT" | grep -E "^DOPPLER_TOKEN" | cut -d'=' -f2- | tr -d ' ' | xargs)
    fi
    # If still empty, assume the file contains just the token
    if [ -z "$SERVICE_TOKEN" ]; then
      SERVICE_TOKEN=$(echo "$GIST_CONTENT" | head -n1 | tr -d ' ' | xargs)
    fi
    if [ -z "$SERVICE_TOKEN" ] || [[ ! "$SERVICE_TOKEN" =~ ^dp\. ]]; then
      echo "Error: Could not extract valid DOPPLER_TOKEN from Gist"
      echo "Expected format: DOPPLER_TOKEN=dp.st.dev.xxx or just dp.st.dev.xxx"
      exit 1
    fi
    echo "Token fetched from Gist successfully"
  fi
else
  # Automatically try team Gist as fallback
  echo "No token found in environment or local files. Trying team Gist..."
  TEAM_GIST_ID="879ddbec01b9c6ebaa04bc1fd1630ad8"
  TEAM_GIST_USER="wistb"
  TEAM_GIST_FILE=".doppler.gist"
  GIST_URL="https://gist.githubusercontent.com/${TEAM_GIST_USER}/${TEAM_GIST_ID}/raw/${TEAM_GIST_FILE}"
  
  GIST_CONTENT=$(curl -sLf --retry 3 --tlsv1.2 --proto "=https" "$GIST_URL" 2>/dev/null)
  if [ -n "$GIST_CONTENT" ]; then
    # Extract token - assume file contains just the token value
    SERVICE_TOKEN=$(echo "$GIST_CONTENT" | head -n1 | tr -d ' ' | tr -d '\n' | xargs)
    if [ -n "$SERVICE_TOKEN" ] && [[ "$SERVICE_TOKEN" =~ ^dp\. ]]; then
      echo "Token fetched from team Gist successfully"
    else
      SERVICE_TOKEN=""
    fi
  fi
  
  if [ -z "$SERVICE_TOKEN" ]; then
    echo "Service token required"
    echo ""
    echo "Get the Doppler service token from team Discord"
    read -sp "Enter service token (hidden): " SERVICE_TOKEN
    echo ""
    
    if [ -z "$SERVICE_TOKEN" ]; then
      echo "No token provided. Exiting."
      echo ""
      echo "Set token using:"
      echo "  1. export DOPPLER_TOKEN='dp.st.dev.xxxx'"
      echo "  2. Create .doppler.token file with the token"
      echo "  3. export DOPPLER_GIST_ID='gist-id' (and optionally DOPPLER_GIST_USER, DOPPLER_GIST_FILE)"
      echo "  4. Create .doppler.gist file with GIST_ID, GIST_USER, GIST_FILE"
      exit 1
    fi
  fi
fi

echo "Linking Doppler CLI to project"
HISTCONTROL=ignorespace doppler setup -t "$SERVICE_TOKEN" --no-interactive

echo "Doppler CLI linked successfully"
echo ""
doppler configure
