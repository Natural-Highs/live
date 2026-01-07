#!/bin/bash
# Shared utilities for development scripts
#
# Source this file: source "$(dirname "$0")/lib/common.sh"

# Default ports (match firebase.json)
# Using 8180 for Firestore to avoid Windows port conflicts with svchost.exe on 8080
AUTH_PORT=9099
FIRESTORE_PORT=8180
UI_PORT=4000
WEBSOCKET_PORT=9151

export FIRESTORE_PORT

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions - prefix should be set by sourcing script
_LOG_PREFIX="${_LOG_PREFIX:-script}"

log_info() { echo -e "${GREEN}[${_LOG_PREFIX}]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[${_LOG_PREFIX}]${NC} $1"; }
log_error() { echo -e "${RED}[${_LOG_PREFIX}]${NC} $1"; }

# Check if a port is in use
port_in_use() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    lsof -i ":$port" >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ss -tuln 2>/dev/null | grep -q ":$port " || return 1
  else
    # Fallback: try to connect (bash-specific)
    (echo >/dev/tcp/127.0.0.1/"$port") 2>/dev/null
  fi
}

# Check if Firebase emulators are responding (with timeout)
emulators_responding() {
  curl -s --connect-timeout 2 "http://127.0.0.1:$AUTH_PORT" >/dev/null 2>&1 && \
  curl -s --connect-timeout 2 "http://127.0.0.1:$FIRESTORE_PORT" >/dev/null 2>&1
}

# Check dependencies for Firebase emulators
check_emulator_dependencies() {
  local missing=()

  if ! command -v curl >/dev/null 2>&1; then
    missing+=("curl (required for health checks)")
  fi

  if ! command -v firebase >/dev/null 2>&1; then
    missing+=("firebase-tools (install: bun add -g firebase-tools)")
  fi

  if ! command -v java >/dev/null 2>&1; then
    missing+=("java (required for Firestore emulator)")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing dependencies:"
    for dep in "${missing[@]}"; do
      echo "  - $dep"
    done
    return 1
  fi
  return 0
}

# Check for port conflicts (returns list of conflicting ports)
# Usage: conflicts=$(check_port_conflicts); if [ -n "$conflicts" ]; then ...
check_port_conflicts() {
  local conflicts=()

  if port_in_use $AUTH_PORT; then
    conflicts+=("$AUTH_PORT (Auth)")
  fi
  if port_in_use $FIRESTORE_PORT; then
    conflicts+=("$FIRESTORE_PORT (Firestore)")
  fi
  if port_in_use $UI_PORT; then
    conflicts+=("$UI_PORT (Emulator UI)")
  fi
  if port_in_use $WEBSOCKET_PORT; then
    conflicts+=("$WEBSOCKET_PORT (WebSocket)")
  fi

  if [ ${#conflicts[@]} -gt 0 ]; then
    printf '%s\n' "${conflicts[@]}"
  fi
}

# Display port conflict error message
show_port_conflict_help() {
  log_warn "Find what's using the ports:"
  echo "  lsof -i :$AUTH_PORT"
  echo "  lsof -i :$FIRESTORE_PORT"
  echo "  lsof -i :$UI_PORT"
  echo "  lsof -i :$WEBSOCKET_PORT"
}

# Display emulator URLs
show_emulator_urls() {
  log_info "  Auth:      http://127.0.0.1:$AUTH_PORT"
  log_info "  Firestore: http://127.0.0.1:$FIRESTORE_PORT"
  log_info "  UI:        http://127.0.0.1:$UI_PORT"
}

# Cleanup background jobs on exit
cleanup_jobs() {
  local pids
  pids=$(jobs -p 2>/dev/null || true)
  if [ -n "$pids" ]; then
    for pid in $pids; do
      kill "$pid" 2>/dev/null || true
    done
    for pid in $pids; do
      wait "$pid" 2>/dev/null || true
    done
  fi
}

# Get firebase config path
get_firebase_config() {
  local project_root
  project_root="$(cd "$SCRIPT_DIR/.." && pwd)"
  echo "$project_root/firebase.json"
}
