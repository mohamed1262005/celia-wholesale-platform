# Caching and Offline-First Architecture

## Existing repository context

This workspace is a Vite + React + Supabase storefront and does not currently contain a server-side .NET application. The runtime architecture therefore needs to be added as a lightweight .NET service layer rather than replacing the existing front-end system. The proposed design follows the current repository structure by leaving the web/mobile clients intact while adding a dedicated cache and invalidation layer that can be consumed by the existing API or future backend services.

## Architecture overview

1. L1 in-memory cache: fastest local reads for hot product and category data.
2. L2 Redis cache: shared cache across app instances and background refresh coordination.
3. Hybrid cache service: orchestrates L1/L2 reads, writes, refresh, and stampede protection.
4. Invalidation bus: emits product, category, pricing, stock, and configuration events.
5. Offline order queue: persists local order submissions on web/mobile clients and resynchronizes when online.
6. Database validation: all prices, stock, discounts, shipping, and eligibility checks remain server-authoritative.

## Cache policy table

| Data type | Cache layer | Strategy | TTL | Invalidation trigger | Consistency |
| --- | --- | --- | --- | --- | --- |
| Product list | L1 + L2 | Cache-aside | 15 min absolute, 5 min sliding | Price, stock, category, delete, search scope | Read-optimized, stale acceptable for short windows |
| Product detail | L1 + L2 | Stale-while-revalidate | 12 h absolute, 30 min sliding | Price, stock, metadata update | Fresh data required for checkout |
| Categories | L1 + L2 | Cache-aside | 24 h absolute, 15 min sliding | Category create/update/delete | Very low mutation rate |
| Configuration | L1 + L2 | Cache-aside | 1 h absolute | Config change event | Accept small delay |
| Cart summary | L1 only | Write-through | 5 min | Cart mutation | Session-scoped, highly local |
| Offline order queue | Local storage / SQLite | Durable local persistence | Until sync success | Successful server ack or rejection | Server validation remains final authority |

## Strategy intent

### Strategy A: Cache-aside

Use for products, categories, and lookups that are read-heavy and relatively stable. The system first checks L1 and then L2, then queries the database only on misses. A sparse set of empty results and missing record markers is cached with short TTLs to prevent thundering-herd behavior without masking data changes.

### Strategy B: Write-around / invalidation

Product updates, price changes, category reassignment, and stock changes should commit to the authoritative database first. After commit success, a cache invalidation event is published so that relevant product list, detail, and category entries are removed or refreshed. This avoids stale pricing and bad inventory during checkout.

### Strategy C: Stale-while-revalidate

Product detail and category data can be served from cache during a brief staleness window while a background refresh occurs. This keeps the hot path fast while preserving correctness; the final checkout always uses fresh server-side price and stock validation.

## Redis Pub/Sub contract

```json
{
  "eventType": "ProductInvalidated",
  "entityType": "product",
  "entityId": "42",
  "scope": "product-catalog",
  "version": "v1",
  "occurredAtUtc": "2026-10-31T12:00:00Z",
  "tenantId": "tenant-default",
  "correlationId": "afde7d4c-82d1-4751-a8da-4129d0d77830"
}
```

Handlers are idempotent and should ignore duplicates or delayed events; a durable outbox is required when strict delivery guarantees are required.

## Offline queue behavior

- Save order locally as pending with a generated idempotency key.
- Show status as Pending synchronization.
- On reconnect, replay the payload with the same idempotency key.
- Server validates final price, stock, discounts, shipping, and customer eligibility.
- Only then confirm the order and return the final total and order id.

## Deployment requirements

- Redis instance for L2 cache and Pub/Sub.
- Environment variables for connection strings, tenant names, and cache versioning.
- Background workers or API triggers for cache refresh and sync.
- Metrics for hit rate, misses, Redis latency, offline queue size, and retries.

## Setup variables

```bash
CACHE__REDIS__CONNECTIONSTRING=localhost:6379
CACHE__REDIS__INSTANCENAME=celia-cache:
ASPNETCORE_ENVIRONMENT=Development
```

## Notes

This repository does not yet include a .NET server. The code in the project acts as a production-ready reference architecture for when the backend is introduced, while preserving the current front-end system intact.
