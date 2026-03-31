# Deploying Edge Functions: Pre-Flight Checklist

**⚠️ READ THIS BEFORE RUNNING `supabase functions deploy`**

---

## Quick Check (30 seconds)

Before deploying any edge functions:

### 1. Is this a Clerk-authenticated function?

```bash
# Check if your new/modified function uses authenticateRequest
grep "authenticateRequest\|verifyClerkToken" supabase/functions/[YOUR_FUNCTION]/index.ts
```

**If YES → You MUST do steps 2-4 below**

**If NO → You can deploy directly**

---

### 2. Add to `supabase/config.toml`

Open `/supabase/config.toml` and add:

```toml
[functions.your-function-name]
verify_jwt = false
```

**Location in file:** Right after the `[functions]` section, grouped with other Clerk functions

**Example:**
```toml
[functions]
[functions.get-user-role]
verify_jwt = false

[functions.admin-crud]
verify_jwt = false

[functions.your-new-function]  # ← Add here
verify_jwt = false
```

### 3. Extract Authorization Header Correctly

In your function code, check you have:

```typescript
// ✅ CORRECT
const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
```

**NOT:**
```typescript
// ❌ WRONG - will fail 50% of the time
const authHeader = req.headers.get("Authorization");
```

### 4. Call `authenticateRequest()`

Before accessing any user data:

```typescript
import { authenticateRequest } from "../_shared/clerk-auth.ts";

// For regular user functions:
const userId = await authenticateRequest(authHeader, serviceClient, false);

// For admin-only functions:
const userId = await authenticateRequest(authHeader, serviceClient, true);
```

---

## Full Checklist (2 minutes)

### Code Review

- [ ] Function uses `authenticateRequest()` or `verifyClerkToken()`
- [ ] Authorization header extracted with BOTH cases:
  ```typescript
  req.headers.get("Authorization") || req.headers.get("authorization")
  ```
- [ ] CORS headers include `"authorization"`:
  ```typescript
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  ```
- [ ] Function has proper error handling with 401 responses
- [ ] Service role client created correctly (not anon key)

### Configuration

- [ ] `supabase/config.toml` updated with `verify_jwt = false` for this function
  ```bash
  grep "^\[functions\.$FUNCTION_NAME\]" supabase/config.toml
  ```
- [ ] No typos in function name in config.toml

### Secrets

- [ ] Verify Clerk secrets are in Supabase (run once):
  ```bash
  supabase secrets list | grep CLERK
  ```
  Should show:
  - `CLERK_ISSUER_URL` ✓
  - `CLERK_JWKS_URL` ✓
  - `CLERK_WEBHOOK_SECRET` ✓ (if using clerk-webhook)

### Ready to Deploy

- [ ] All checks above completed
- [ ] Changes committed to git
- [ ] You're ready to run: `supabase functions deploy`

---

## Deployment

```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy your-function-name
```

**Expected output:**
```
Deploying Function: your-function-name (script size: XXX.XkB)
Deployed Functions on project isexlpmxnhuezhkmbuyu: your-function-name
```

**⚠️ If you see "No change found":** The function code wasn't modified. That's OK if you only changed config.toml.

---

## Post-Deployment Verification (2 minutes)

### 1. Check Deployment Status

```bash
supabase functions list | grep your-function-name
```

Should show: `ACTIVE` status, recent timestamp

### 2. Check Function Logs

```bash
# View latest logs
supabase functions logs your-function-name --follow
```

Wait for a log entry, then Ctrl+C to exit.

**Expected logs for Clerk-authenticated function:**
```
Auth header present: true
JWT verification successful, userId: user_xxxxx
```

**NOT expected:**
```
Auth header present: false
Authentication failed: Invalid JWT
```

### 3. Test with Real Token

**In browser console:**

```javascript
// Get your Clerk token
const token = await window.Clerk?.session?.getToken();
console.log('Token:', token);

// Call your function
const response = await fetch(
  'https://isexlpmxnhuezhkmbuyu.supabase.co/functions/v1/your-function-name',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ /* your test data */ })
  }
);

// Check response
const data = await response.json();
console.log('Response:', data);
console.log('Status:', response.status);
```

**Expected:**
- Status: `200`
- Data: Your function's success response (NOT `{ code: 401, message: "Invalid JWT" }`)

### 4. Check Browser Console

In your app, trigger the function and check browser console:

- [ ] No `401 (Unauthorized)` errors
- [ ] Function successfully returns data
- [ ] No "Error checking admin role" messages

---

## If Something Breaks: Troubleshooting

### Function returns 401 "Invalid JWT"

1. **Check config.toml has `verify_jwt = false`:**
   ```bash
   grep -A 1 "^\[functions.your-function\]" supabase/config.toml
   ```

2. **Check Authorization header extraction:**
   ```bash
   grep "req.headers.get.*[Aa]uthorization" supabase/functions/your-function/index.ts
   ```
   Should show BOTH cases

3. **Check function logs:**
   ```bash
   supabase functions logs your-function --follow
   ```
   Look for:
   - `Auth header present: true` (if false, header not reaching function)
   - `CLERK_ISSUER_URL: SET` (if missing, secrets not configured)
   - `JWT verification failed` (if yes, Clerk keys mismatch)

4. **Redeploy function:**
   ```bash
   supabase functions deploy your-function-name
   ```

### No error but function doesn't work as expected

1. Check function logic (not an auth issue)
2. Check service role client has permission to query table
3. Check request body is being parsed correctly

---

## Remember

> **The config.toml file is the MOST CRITICAL part of the auth system.**
>
> It tells Supabase to skip its JWT verification so your custom Clerk verification can work.
>
> **If you forget to add `verify_jwt = false`, your function will return 401 even if the code is correct.**

---

## Shortcuts

### One-liner to validate your function is ready

```bash
echo "=== Config ===" && grep -A1 "^\[functions\.your-function\]" supabase/config.toml && echo "=== Header check ===" && grep "req.headers.get.*uthorization" supabase/functions/your-function/index.ts && echo "=== Auth check ===" && grep "authenticateRequest\|verifyClerkToken" supabase/functions/your-function/index.ts && echo "✓ All checks passed!"
```

### Deploy and verify in one go

```bash
supabase functions deploy && sleep 2 && supabase functions logs your-function-name --follow
```

(Ctrl+C after you see the logs)

---

## Need Help?

1. **Read:** `AUTH_SETUP_GUIDE.md` (detailed reference)
2. **Read:** `AUTHENTICATION_FLOW.md` (architecture & debugging)
3. **Check:** Function logs in Supabase dashboard
4. **Search:** This checklist for your error message
