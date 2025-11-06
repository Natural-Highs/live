#!/bin/bash
# Free specified ports
# Kills processes using ports: 3000, 4000, 5174, 8080, 9099

set -e

PORTS=(3000 4000 5174 8080 9099)
PORT_NAMES=(
  "Backend API"
  "Firebase Emulator UI"
  "Frontend Dev Server"
  "Firestore Emulator"
  "Firebase Auth Emulator"
)

FOUND=false

echo "Checking for processes using development ports..."
echo ""

# Check if lsof is available
if ! command -v lsof &> /dev/null; then
  echo "❌ lsof not found. Please install: sudo apt-get install -y lsof"
  exit 1
fi

for i in "${!PORTS[@]}"; do
  PORT=${PORTS[$i]}
  NAME=${PORT_NAMES[$i]}
  
  # Find process using the port (try lsof first, then fallback to fuser)
  PID=$(lsof -ti:$PORT 2>/dev/null || fuser $PORT/tcp 2>/dev/null | awk '{print $1}' || true)
  
  if [ -n "$PID" ]; then
    FOUND=true
    PROCESS_INFO=$(ps -p $PID -o comm=,args= 2>/dev/null | head -1 || echo "unknown")
    echo "⚠️  Port $PORT ($NAME) is in use by PID $PID"
    echo "   Process: $PROCESS_INFO"
    
    # Kill the process
    if kill -9 $PID 2>/dev/null; then
      echo "   ✅ Freed port $PORT"
    else
      echo "   ❌ Failed to free port $PORT"
    fi
    echo ""
  fi
done

if [ "$FOUND" = false ]; then
  echo "✅ All development ports are free"
else
  echo "✅ Port cleanup complete"
fi

