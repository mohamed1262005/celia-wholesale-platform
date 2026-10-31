# Celia Wholesale API

ASP.NET Core API for cached public catalog reads. Customer checkout remains protected by Supabase Auth and uses a database RPC for authoritative pricing, stock reservation, and idempotent order creation. Offline checkout drafts are held in browser IndexedDB until the connection returns.

## Local development

Redis is disabled by default; the API uses in-memory distributed cache so it can run without a Redis server.

```powershell
dotnet run --project backend/CeliaWholesale.Backend/CeliaWholesale.Backend.csproj --urls http://localhost:5000
```

The API endpoints are `/api/catalog/products`, `/api/catalog/products/{uuid}`, `/api/catalog/categories`, and `/health`. Swagger is available in Development.

To route the browser catalog through the API, set `VITE_CATALOG_API_URL` to `http://localhost:5000/api/catalog` in an ignored local `.env.local` file, then restart Vite. If it is unset, the app keeps using its existing Supabase catalog path.

Android builds should use an HTTPS API origin. The Android manifest does not enable cleartext traffic; do not point a release APK/AAB at a local HTTP server.

## Supabase migration

Apply `supabase/migrations/20261031000000_offline_checkout_and_inventory.sql` before using the new checkout flow. It adds missing order/profile compatibility fields, product base pricing and computed available stock, a transactional `place_order` RPC, order idempotency, and inventory reservation/release triggers. The RPC is executable only by authenticated users; it ignores client prices and checks stock and pricing tiers inside the transaction.

The checked-in frontend key currently receives `Invalid API key` from Supabase. Set the valid project URL and publishable/anon key in the local `.env.local` file and set the matching `Supabase__Url` and `Supabase__AnonKey` environment variables for the API. Never use a Supabase `service_role` key in the browser or this catalog API.

```powershell
$env:Supabase__Url = 'https://<project-ref>.supabase.co'
$env:Supabase__AnonKey = '<project publishable key>'
```

## Redis

Enable Redis with environment variables:

```powershell
$env:Cache__Redis__Enabled = 'true'
$env:Cache__Redis__ConnectionString = 'localhost:6379'
```

When enabled, Redis is the shared distributed cache and Pub/Sub carries catalog invalidation events between API instances. The API's Redis subscriber is started by the host. Any server-side catalog writer must publish the documented event on `celia:cache:invalidation`; direct Supabase admin writes otherwise age out according to cache TTL.

## CORS and deployment

Local Vite and Capacitor origins are in `appsettings.json`. Set `Cors__AllowedOrigins__0`, `Cors__AllowedOrigins__1`, etc. to the exact production storefront and app origins. Deploy the API over HTTPS and set `VITE_CATALOG_API_URL` to its `/api/catalog` base URL before building the web app or Android package.

## Validation

```powershell
dotnet test backend/CeliaWholesale.CacheArchitecture.sln --nologo --verbosity minimal
npm run build
```

These checks do not apply the Supabase migration or verify a live Redis instance; those require the project's external services and deployment configuration.
