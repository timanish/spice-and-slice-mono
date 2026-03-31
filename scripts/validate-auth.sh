#!/bin/bash
# Validation script: Check that auth configuration is correct
# Usage: ./scripts/validate-auth.sh
# or:    bash scripts/validate-auth.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$REPO_ROOT/supabase/config.toml"
FUNCTIONS_DIR="$REPO_ROOT/supabase/functions"

echo "🔍 Validating Authentication Configuration..."
echo ""

ERRORS=0
WARNINGS=0

# Clerk-authenticated functions (need verify_jwt = false)
CLERK_FUNCTIONS=(
  "admin-adjust-order"
  "admin-crud"
  "admin-get-orders"
  "admin-get-subscriptions"
  "admin-update-order"
  "ai-chat"
  "calculate-delivery-distance"
  "check-pickup-reminders"
  "complete-lunchbox-subscription"
  "complete-stripe-order"
  "confirm-customer-order"
  "create-cash-order"
  "create-checkout"
  "create-lunchbox-checkout"
  "create-pending-order"
  "fetch-menu-images"
  "generate-menu-descriptions"
  "get-user-role"
  "printer-create-job"
  "send-admin-customer-message"
  "send-lunchbox-subscription-email"
  "send-order-status-email"
  "send-pickup-reminder"
  "upload-image"
  "user-data"
)

# Check 1: All Clerk functions have verify_jwt = false
echo "✓ Check 1: Config.toml has verify_jwt = false for all Clerk functions"
for func in "${CLERK_FUNCTIONS[@]}"; do
  if grep -q "^\[functions\.$func\]" "$CONFIG_FILE"; then
    if grep -A1 "^\[functions\.$func\]" "$CONFIG_FILE" | grep -q "verify_jwt = false"; then
      echo "  ✓ $func"
    else
      echo "  ✗ $func - Missing 'verify_jwt = false' or has wrong value"
      ((ERRORS++))
    fi
  else
    echo "  ✗ $func - NOT IN CONFIG.TOML (THIS WILL BREAK AUTH!)"
    ((ERRORS++))
  fi
done

echo ""

# Check 2: All Clerk functions extract Authorization header correctly
echo "✓ Check 2: All Clerk functions extract Authorization header with fallback"
for func in "${CLERK_FUNCTIONS[@]}"; do
  if [ -f "$FUNCTIONS_DIR/$func/index.ts" ]; then
    if grep -q 'req.headers.get("Authorization") || req.headers.get("authorization")' "$FUNCTIONS_DIR/$func/index.ts"; then
      echo "  ✓ $func"
    else
      # Check if it at least uses authenticateRequest (might extract differently)
      if grep -q "authenticateRequest\|verifyClerkToken" "$FUNCTIONS_DIR/$func/index.ts"; then
        # Check how it extracts
        if grep -q 'req.headers.get("authorization")' "$FUNCTIONS_DIR/$func/index.ts"; then
          echo "  ⚠ $func - Uses lowercase only (should handle both cases)"
          ((WARNINGS++))
        elif grep -q 'req.headers.get("Authorization")' "$FUNCTIONS_DIR/$func/index.ts"; then
          echo "  ⚠ $func - Uses uppercase only (should handle both cases)"
          ((WARNINGS++))
        else
          echo "  ? $func - Could not find header extraction (manual check needed)"
          ((WARNINGS++))
        fi
      else
        echo "  ? $func - Does not seem to use authenticateRequest"
        ((WARNINGS++))
      fi
    fi
  fi
done

echo ""

# Check 3: All Clerk functions call authenticateRequest()
echo "✓ Check 3: All Clerk functions call authenticateRequest()"
for func in "${CLERK_FUNCTIONS[@]}"; do
  if [ -f "$FUNCTIONS_DIR/$func/index.ts" ]; then
    if grep -q "authenticateRequest" "$FUNCTIONS_DIR/$func/index.ts"; then
      echo "  ✓ $func"
    else
      echo "  ⚠ $func - Does not call authenticateRequest (should have JWT verification)"
      ((WARNINGS++))
    fi
  fi
done

echo ""

# Check 4: No function has verify_jwt = true (which would break custom Clerk JWT)
echo "✓ Check 4: No Clerk functions have verify_jwt = true"
BADVERIFY=$(grep -B1 "verify_jwt = true" "$CONFIG_FILE" | grep "^\[functions\." | wc -l)
if [ "$BADVERIFY" -gt 0 ]; then
  echo "  ✗ Found $BADVERIFY functions with 'verify_jwt = true' - THIS BREAKS AUTH"
  grep -B1 "verify_jwt = true" "$CONFIG_FILE" | grep "^\[functions\."
  ((ERRORS++))
else
  echo "  ✓ No problematic verify_jwt = true found"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo "✅ All authentication configuration checks passed!"
  exit 0
elif [ "$ERRORS" -eq 0 ]; then
  echo "⚠️  Validation passed with $WARNINGS warning(s)"
  echo ""
  echo "Warnings can usually be ignored, but check them if you just modified auth code."
  exit 0
else
  echo "❌ Validation FAILED with $ERRORS error(s)"
  echo ""
  echo "ERRORS MUST BE FIXED BEFORE DEPLOYING:"
  echo "  1. Read: DEPLOYING_EDGE_FUNCTIONS.md"
  echo "  2. Read: AUTH_SETUP_GUIDE.md"
  echo "  3. Check supabase/config.toml for missing [functions.XXXX] sections"
  echo ""
  exit 1
fi
