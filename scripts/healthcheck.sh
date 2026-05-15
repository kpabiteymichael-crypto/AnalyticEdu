#!/usr/bin/env bash
# Quick health check — useful in Docker HEALTHCHECK or UptimeRobot custom scripts
set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
RESPONSE=$(curl -fsSL --max-time 5 "$API_URL/api/health" 2>/dev/null)

if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  echo "✓ API healthy: $RESPONSE"
  exit 0
else
  echo "✗ API unhealthy: $RESPONSE" >&2
  exit 1
fi
