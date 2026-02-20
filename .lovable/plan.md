

## Fix: Shopify Sync - Use Existing Access Token

### Problem
The `sync-shopify-orders` edge function tries to obtain an access token via OAuth client credentials flow (`SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET`), but Shopify returns `400 - app_not_installed`. This means the app is not installed on the store via OAuth.

Meanwhile, a `SHOPIFY_ACCESS_TOKEN` secret is already configured and ready to use.

### Solution
Update `supabase/functions/sync-shopify-orders/index.ts` to use the `SHOPIFY_ACCESS_TOKEN` environment variable directly instead of the OAuth token exchange.

### Changes

**File: `supabase/functions/sync-shopify-orders/index.ts`**

1. Remove the `getShopifyAccessToken()` function entirely (the OAuth client credentials exchange)
2. Replace the token retrieval logic with:
   ```
   const accessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
   if (!accessToken) throw new Error('Missing SHOPIFY_ACCESS_TOKEN');
   ```
3. Remove the dependency on `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` (they can stay as secrets but won't be used)
4. Keep everything else the same -- the API call already uses `X-Shopify-Access-Token` header correctly

### Technical Detail
- Only one file changes: `supabase/functions/sync-shopify-orders/index.ts`
- The rest of the sync logic (order filtering by "LD" tag, customer creation, job creation, line items, idempotency checks) remains unchanged
- The function will be automatically redeployed after the edit

