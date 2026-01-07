#!/bin/bash
# Firebase Emulators with graceful error handling
#
# Usage: emulators.sh [--restart]
#
# Handles common edge cases:
# - Emulators already running (use --restart to kill and restart)
# - Missing dependencies (curl, firebase CLI, Java)
# - Port conflicts (all emulator ports)

set -e
set -o pipefail

# Parse arguments
RESTART_FLAG=false
FORCE_FLAG=false
for arg in "$@"; do
  case $arg in
    --restart|-r)
      RESTART_FLAG=true
      ;;
    --force|-f)
      FORCE_FLAG=true
      RESTART_FLAG=true
      ;;
  esac
done

# Load shared utilities
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
_LOG_PREFIX="emulators"
source "$SCRIPT_DIR/lib/common.sh"

# Cleanup on exit/interrupt
cleanup() {
  echo ""
  log_info "Stopping emulators..."
  cleanup_jobs
}
trap cleanup EXIT SIGINT SIGTERM

# Main logic
main() {
  # Check dependencies first
  if ! check_emulator_dependencies; then
    exit 1
  fi

  # Check if emulators are already running or ports in use
  local _did_kill=false
  if emulators_responding || [ "$FORCE_FLAG" = "true" ]; then
    if [ "$RESTART_FLAG" = "true" ]; then
      log_warn "Killing existing emulators..."
      pkill -f 'firebase.*emulators' 2>/dev/null || true
      pkill -f 'java.*firestore' 2>/dev/null || true
      taskkill //F //IM java.exe 2>/dev/null || true
      _did_kill=true
      # Wait for ports to be released
      local wait_time=0
      while [ $wait_time -lt 10 ]; do
        sleep 1
        wait_time=$((wait_time + 1))
        if ! port_in_use $AUTH_PORT && ! port_in_use $FIRESTORE_PORT; then
          break
        fi
        [ $wait_time -eq 5 ] && log_info "Waiting for ports to be released..."
      done
    else
      log_info "Emulators already running"
      show_emulator_urls
      echo ""
      log_warn "To restart, use: scripts/emulators.sh --force"
      exit 0
    fi
  fi

  # Check for port conflicts (skip if we just killed emulators)
  if [ "$_did_kill" != "true" ]; then
    local conflicts
    conflicts=$(check_port_conflicts)
    if [ -n "$conflicts" ]; then
      log_error "Port conflict detected (not Firebase emulators):"
      echo "$conflicts" | while read -r conflict; do
        echo "  - Port $conflict is in use"
      done
      echo ""
      show_port_conflict_help
      exit 1
    fi
  fi

  # Start emulators with appropriate config
  local config_file
  config_file=$(get_firebase_config)

  log_info "Starting Firebase emulators..."
  firebase emulators:start --config "$config_file"
}

main "$@"
