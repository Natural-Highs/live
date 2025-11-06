#!/bin/bash
echo "🔍 Checking Natural Highs Development Setup..."
echo ""

# Check Firebase Auth
if curl -s http://localhost:9099 > /dev/null 2>&1; then
  echo "✅ Firebase Auth Emulator: Running (port 9099)"
else
  echo "❌ Firebase Auth Emulator: NOT RUNNING (port 9099)"
fi

# Check Firestore
if curl -s http://localhost:8080 > /dev/null 2>&1; then
  echo "✅ Firestore Emulator: Running (port 8080)"
else
  echo "❌ Firestore Emulator: NOT RUNNING (port 8080)"
fi

# Check Backend
if curl -s http://localhost:3000/api/auth/sessionLogin > /dev/null 2>&1; then
  echo "✅ Backend Server: Running (port 3000)"
else
  echo "❌ Backend Server: NOT RUNNING (port 3000)"
fi

# Check Frontend
if curl -s http://localhost:5174 > /dev/null 2>&1; then
  echo "✅ Frontend Dev Server: Running (port 5174)"
else
  echo "❌ Frontend Dev Server: NOT RUNNING (port 5174)"
fi

# Check service account
echo ""
echo "Firebase Admin SDK Configuration:"
if [ -f "serviceAccount.json" ]; then
  echo "✅ serviceAccount.json: Found"
else
  if [ -n "$FIREBASE_SERVICE_ACCOUNT" ]; then
    echo "✅ FIREBASE_SERVICE_ACCOUNT: Set (from Doppler/env)"
  else
    echo "❌ Firebase Service Account: NOT FOUND"
    echo "   Need either:"
    echo "   - serviceAccount.json file in project root, OR"
    echo "   - FIREBASE_SERVICE_ACCOUNT environment variable"
  fi
fi

# Check environment variables
echo ""
echo "Frontend Firebase Config (Vite):"
if [ -n "$VITE_APIKEY" ] || [ -n "$(doppler secrets get VITE_APIKEY --plain 2>/dev/null)" ]; then
  echo "✅ VITE_APIKEY: Set"
else
  echo "⚠️  VITE_APIKEY: Not set (may use defaults)"
fi

if [ -n "$VITE_PROJECT_ID" ] || [ -n "$(doppler secrets get VITE_PROJECT_ID --plain 2>/dev/null)" ]; then
  echo "✅ VITE_PROJECT_ID: Set"
else
  echo "⚠️  VITE_PROJECT_ID: Not set (may use defaults)"
fi

echo ""
echo "📋 Quick Links:"
echo "   Firebase Emulator UI: http://localhost:4000"
echo "   Frontend App: http://localhost:5174"
echo "   Backend API: http://localhost:3000"
echo ""
echo "💡 To start all services:"
echo "   Terminal 1: bun run emulators"
echo "   Terminal 2: bun run server"  
echo "   Terminal 3: bun run dev"
echo ""
echo "💡 Or use: bun run dev:full"

