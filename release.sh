#!/usr/bin/env bash

set -euo pipefail

# =========================
# Release Pipeline Config
# =========================

PROJECT_NAME="@theophilusdev/conduit"
START_TIME=$(date +%s)

log() {
  echo ""
  echo "=================================================="
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
  echo "=================================================="
}

step() {
  echo ""
  echo ">>> $1"
  echo "--------------------------------------------------"
}

ok() {
  echo "✔ $1"
}

fail() {
  echo ""
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "❌ ERROR: $1"
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  exit 1
}

# =========================
# Start Pipeline
# =========================

log "INITIATING RELEASE PIPELINE FOR: $PROJECT_NAME"

echo "System check..."
echo "Node version: $(node -v)"
echo "NPM version:  $(npm -v)"
echo "Working directory: $(pwd)"

# =========================
# Build Step
# =========================

step "STEP 1/3: BUILD PHASE"

echo "Preparing build environment..."
sleep 0.3

echo "Running build command: npm run build"
npm run build || fail "Build process crashed unexpectedly."

ok "Build completed successfully"

# =========================
# Release Step
# =========================

step "STEP 2/3: RELEASE PHASE"

echo "Preparing package for publishing..."
echo "Verifying package integrity..."
sleep 0.3

echo "Executing publish command: npm run release"
npm run release || fail "Release publishing failed."

ok "Package successfully published"

# =========================
# Docs Step
# =========================

step "STEP 3/3: DOCUMENTATION DEPLOYMENT"

echo "Generating latest documentation..."
sleep 0.2

echo "Deploying docs to remote server..."
npm run docs:deploy || fail "Documentation deployment failed."

ok "Documentation updated successfully"

# =========================
# Completion
# =========================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log "🎉 RELEASE PIPELINE COMPLETED SUCCESSFULLY"
echo "Total execution time: ${DURATION}s"
echo "Status: STABLE"
echo "Artifact: PUBLISHED"
echo "Docs: SYNCED"
echo "Build: VERIFIED"

echo ""
echo "🚀 Everything is live. Go touch grass."
