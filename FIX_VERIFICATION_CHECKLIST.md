# JWT Authentication Fix - Verification Checklist

## Root Cause

The 401 "Invalid JWT" regression was caused by two issues:

1. **Missing Function Configuration** - `supabase/config.toml` was incomplete. Functions not explicitly configured with `verify_jwt = false` may have Supabase's default JWT verification interfere with custom Clerk JWT handling.

2. **Header Case Sensitivity** - Edge functions only checked for capitalized `Authorization` header, but Supabase's runtime (or proxies) may convert headers to lowercase `authorization`, causing the extraction to fail silently.

## Changes Made

### 1. supabase/config.toml
- Added all 26 Clerk-authenticated functions with `verify_jwt = false`
- This tells Supabase to skip built-in JWT verification and let functions handle custom Clerk JWT

### 2. All Clerk-Authenticated Edge Functions (18 functions)
Updated Authorization header extraction to handle both cases:
```typescript
// Before (fails if header is lowercase)
const authHeader = req.headers.get("Authorization");

// After (handles both cases)
const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
```

### 3. AUTHENTICATION_FLOW.md
- Complete architecture documentation
- Full inventory of 26 JWT functions vs 7 public functions
- Root cause analysis

---

## Pre-Deployment Verification ✅

### Environment Variables (Supabase Dashboard)
Check that these are set in your remote Supabase instance:

1. **Go to:** Supabase Dashboard → Your Project → Settings → Edge Functions → Secrets

2. **Verify these are SET:**
   - ✓ `CLERK_ISSUER_URL` (e.g., `https://xxxxx-clerk.accounts.com`)
   - ✓ `CLERK_JWKS_URL` (e.g., `https://xxxxx-clerk.accounts.com/.well-known/jwks.json`)
   - ✓ `SUPABASE_URL`
   - ✓ `SUPABASE_SERVICE_ROLE_KEY`

If any are MISSING, you'll see "MISSING" in the function logs and will need to set them before deploying.

---

## Deployment Steps

### Step 1: Deploy Updated Functions
```bash
supabase functions deploy
```

Expected output: All functions deploy successfully

### Step 2: Check Deployment Status
Wait for all functions to be live (usually 1-2 minutes)

---

## Post-Deployment Testing ✅

### Test 1: Verify Admin Role Check Works
1. Login to the app as an ADMIN user
2. Open Browser Console (F12 → Console)
3. Check if "Admin" button appears in the navbar/order management

**Expected Result:** Admin button visible, no 401 errors

**If Failed:** Check browser Network tab for get-user-role response

### Test 2: Direct API Test
In browser console, run:
```javascript
const token = await window.Clerk?.session?.getToken();
const response = await fetch(
  'https://xxxxx.supabase.co/functions/v1/get-user-role',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);
const data = await response.json();
console.log('get-user-role response:', data);
```

**Expected Result:**
```
{role: "admin", isAdmin: true}      // for admin users
// OR
{role: "user", isAdmin: false}       // for regular users
```

**NOT Expected:**
```
{code: 401, message: "Invalid JWT"}  // indicates fix didn't work
```

### Test 3: Check Function Logs
1. Supabase Dashboard → Edge Functions → get-user-role → Invocations
2. Click latest invocation
3. Look at the logs - should see:
   ```
   Checking Clerk secrets...
   CLERK_ISSUER_URL: SET
   CLERK_JWKS_URL: SET
   Auth header present: true
   JWT verification successful, userId: user_xxxxx
   ```

**Problem Signs:**
- `Auth header present: false` → header isn't reaching function
- `CLERK_ISSUER_URL: MISSING` or `CLERK_JWKS_URL: MISSING` → secrets not set
- `Invalid JWT` → token is invalid or Clerk keys don't match

### Test 4: Order Management (Admin Feature)
1. Login as admin
2. Go to Orders page
3. Try to update order status (change to "Confirmed", "Preparing", etc.)
4. Should work without 401 error

**Expected Result:** Order status updates successfully

### Test 5: Verify Other Functions Work
Test a few other Clerk-authenticated functions:
- **user-data** - Load profile page (calls user-data function)
- **upload-image** - Try to upload profile image
- **create-checkout** - Go to checkout and create order (calls create-checkout)

**Expected Result:** No 401 errors for any of these

---

## Debugging if Tests Fail

### Issue: Still Getting 401 "Invalid JWT"

**Step 1: Check Authorization Header Extraction**
In Supabase function logs, look for:
```
Auth header present: false
```

If TRUE: The header IS reaching the function, but JWT verification is failing
If FALSE: The header is NOT reaching the function (proxy/middleware issue)

**Step 2: If Header is Present but JWT Fails**
Check logs for:
```
CLERK_ISSUER_URL: SET
CLERK_JWKS_URL: SET
```

- If MISSING: Set these in Supabase Secrets and redeploy
- If SET: The Clerk keys might be wrong or rotated

Verify Clerk secrets match:
- Go to Clerk Dashboard → Developers → API Keys
- Copy `Issuer URL` and `JWKS URL`
- Paste into Supabase Secrets

**Step 3: If Header is NOT Reaching Function**
This indicates a Supabase/proxy layer issue. Check:
1. Is CORS configured correctly? (corsHeaders in function include "authorization")
2. Is there a middleware/proxy filtering headers?
3. Run a redeploy to refresh function configuration

**Step 4: Verify config.toml**
Check that config.toml has `verify_jwt = false` for get-user-role:
```toml
[functions.get-user-role]
verify_jwt = false
```

And redeploy.

---

## Rollback Plan (If Needed)

If something breaks after deployment:

```bash
# Get previous commit hash
git log --oneline | head -1

# Revert to previous version
git revert HEAD
supabase functions deploy
```

Previous working commit: `69a04a1 feat(create-cash-order): add full address to pickup location in email`

---

## Success Criteria

✅ All tests pass:
- [ ] Admin button visible when logged in as admin
- [ ] get-user-role returns correct role without 401
- [ ] Order status updates work
- [ ] No 401 errors in browser console
- [ ] Function logs show "JWT verification successful"

✅ Once all tests pass:
- Admin role is recognized
- Order management features work
- System is back to working state (3-4 hours ago)

---

## Next Steps

1. Run: `supabase functions deploy`
2. Wait 1-2 minutes for deployment
3. Test using Test 1-5 above
4. Report results

If all tests pass ✅, the fix is complete.
If any test fails ❌, provide the error from function logs.
