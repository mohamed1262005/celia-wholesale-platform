using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Collections.Concurrent;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<MemoryCacheStore>();
builder.Services.AddSingleton<RedisCacheStore>();
builder.Services.AddSingleton<HybridCacheService>();
builder.Services.AddSingleton<CacheInvalidationBus>();
builder.Services.AddSingleton<CatalogService>();
builder.Services.AddSingleton<OfflineOrderQueue>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestampUtc = DateTimeOffset.UtcNow }));

app.MapGet("/products", async (CatalogService catalog, [AsParameters] ProductQuery query) =>
{
    var items = await catalog.GetProductsAsync(query);
    return Results.Ok(items);
});

app.MapGet("/products/{productId:int}", async (CatalogService catalog, int productId) =>
{
    var item = await catalog.GetProductAsync(productId);
    return item is null ? Results.NotFound() : Results.Ok(item);
});

app.MapPost("/products/price", async (CatalogService catalog, UpdateProductPriceRequest request) =>
{
    await catalog.UpdatePriceAsync(request.ProductId, request.NewPrice);
    return Results.Ok(new { message = "Price updated and cache invalidated." });
});

app.MapPost("/orders/offline", async (OfflineOrderQueue queue, OfflineOrderRequest request) =>
{
    var pending = new PendingOrder(
        Guid.NewGuid().ToString("N"),
        request.CustomerId,
        request.Lines.Select(l => new OrderLine(l.ProductId, l.Quantity, l.UnitPrice)).ToList(),
        request.Lines.Sum(l => l.UnitPrice * l.Quantity),
        "PendingSynchronization",
        request.IdempotencyKey ?? Guid.NewGuid().ToString("N"),
        DateTimeOffset.UtcNow);

    await queue.QueuePendingOrderAsync(pending);
    return Results.Accepted(new { orderId = pending.Id, status = pending.Status });
});

app.MapPost("/orders/offline/sync", async (OfflineOrderQueue queue) =>
{
    var result = await queue.SyncPendingOrdersAsync();
    return Results.Ok(result);
});

app.Run();

public enum CacheStrategy
{
    CacheAside,
    WriteThrough,
    WriteAround,
    StaleWhileRevalidate
}

public sealed record CachePolicy(
    string Name,
    TimeSpan AbsoluteExpiration,
    TimeSpan SlidingExpiration,
    CacheStrategy Strategy,
    bool UseStaleWhileRevalidate,
    bool VersionedKeys = true,
    int MaxEntries = 1000);

public sealed record CacheEntryOptions(
    DateTimeOffset AbsoluteExpirationUtc,
    TimeSpan SlidingExpiration,
    string Version = "v1");

public sealed record CacheInvalidationEvent(
    string EntityType,
    string EntityId,
    string Scope,
    string Version,
    DateTimeOffset OccurredAtUtc,
    string? TenantId = null,
    string? CorrelationId = null);

public sealed record Product(
    int Id,
    string Name,
    decimal Price,
    int Stock,
    string Category,
    string Description,
    DateTimeOffset UpdatedAtUtc);

public sealed record ProductQuery(
    string? Search = null,
    int Page = 1,
    int PageSize = 20,
    string? Language = "en",
    string? Currency = "USD");

public sealed record PendingOrder(
    string Id,
    string CustomerId,
    List<OrderLine> Lines,
    decimal Amount,
    string Status,
    string IdempotencyKey,
    DateTimeOffset CreatedAtUtc);

public sealed record OrderLine(int ProductId, int Quantity, decimal UnitPrice);

public sealed record OrderSyncResult(string OrderId, bool IsAccepted, string Status, decimal FinalTotal);
public sealed record UpdateProductPriceRequest(int ProductId, decimal NewPrice);
public sealed record OfflineOrderRequest(string CustomerId, string? IdempotencyKey, List<OfflineOrderLineRequest> Lines);
public sealed record OfflineOrderLineRequest(int ProductId, int Quantity, decimal UnitPrice);

public static class CacheKeyBuilder
{
    public static string ProductList(ProductQuery query, string version = "v1") =>
        $"products:list:{version}:{query.Language}:{query.Currency}:{query.Search ?? "*"}:{query.Page}:{query.PageSize}";

    public static string ProductDetail(int productId, string version = "v1") =>
        $"products:detail:{version}:{productId}";

    public static string CategoryList(string version = "v1") =>
        $"categories:list:{version}";
}

public interface ICacheStore
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);
    Task SetAsync<T>(string key, T value, CacheEntryOptions options, CancellationToken cancellationToken = default);
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
    Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default);
}

public sealed class MemoryCacheStore : ICacheStore
{
    private readonly ConcurrentDictionary<string, CacheEntry> _entries = new();

    public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        if (_entries.TryGetValue(key, out var entry) && entry.ExpiresAtUtc > DateTimeOffset.UtcNow)
        {
            entry.LastAccessedUtc = DateTimeOffset.UtcNow;
            return Task.FromResult((T?)entry.Value);
        }

        _entries.TryRemove(key, out _);
        return Task.FromResult(default(T));
    }

    public Task SetAsync<T>(string key, T value, CacheEntryOptions options, CancellationToken cancellationToken = default)
    {
        _entries[key] = new CacheEntry
        {
            Value = value,
            AbsoluteExpirationUtc = options.AbsoluteExpirationUtc,
            SlidingExpiration = options.SlidingExpiration,
            LastAccessedUtc = DateTimeOffset.UtcNow,
            Version = options.Version
        };

        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        _entries.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default)
    {
        foreach (var key in _entries.Keys.Where(k => k.StartsWith(prefix, StringComparison.Ordinal)).ToList())
        {
            _entries.TryRemove(key, out _);
        }

        return Task.CompletedTask;
    }

    private sealed class CacheEntry
    {
        public object? Value { get; set; }
        public DateTimeOffset AbsoluteExpirationUtc { get; set; }
        public TimeSpan SlidingExpiration { get; set; }
        public DateTimeOffset LastAccessedUtc { get; set; }
        public string Version { get; set; } = "v1";
    }
}

public sealed class RedisCacheStore : ICacheStore
{
    private readonly ConcurrentDictionary<string, CacheEntry> _entries = new();

    public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        if (_entries.TryGetValue(key, out var entry) && entry.ExpiresAtUtc > DateTimeOffset.UtcNow)
        {
            return Task.FromResult((T?)entry.Value);
        }

        _entries.TryRemove(key, out _);
        return Task.FromResult(default(T));
    }

    public Task SetAsync<T>(string key, T value, CacheEntryOptions options, CancellationToken cancellationToken = default)
    {
        _entries[key] = new CacheEntry
        {
            Value = value,
            ExpiresAtUtc = options.AbsoluteExpirationUtc,
            Version = options.Version
        };

        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        _entries.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default)
    {
        foreach (var key in _entries.Keys.Where(k => k.StartsWith(prefix, StringComparison.Ordinal)).ToList())
        {
            _entries.TryRemove(key, out _);
        }

        return Task.CompletedTask;
    }

    private sealed class CacheEntry
    {
        public object? Value { get; set; }
        public DateTimeOffset ExpiresAtUtc { get; set; }
        public string Version { get; set; } = "v1";
    }
}

public sealed class HybridCacheService
{
    private readonly ICacheStore _l1;
    private readonly ICacheStore _l2;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public HybridCacheService(MemoryCacheStore l1, RedisCacheStore l2)
    {
        _l1 = l1;
        _l2 = l2;
    }

    public async Task<T?> GetOrCreateAsync<T>(
        string key,
        CachePolicy policy,
        Func<Task<T?>> factory,
        CancellationToken cancellationToken = default)
    {
        var cached = await _l1.GetAsync<T>(key, cancellationToken);
        if (cached is not null) return cached;

        cached = await _l2.GetAsync<T>(key, cancellationToken);
        if (cached is not null)
        {
            await _l1.SetAsync(key, cached, new CacheEntryOptions(DateTimeOffset.UtcNow.Add(policy.AbsoluteExpiration), policy.SlidingExpiration), cancellationToken);
            return cached;
        }

        var gate = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);

        try
        {
            cached = await _l1.GetAsync<T>(key, cancellationToken);
            if (cached is not null) return cached;

            cached = await _l2.GetAsync<T>(key, cancellationToken);
            if (cached is not null)
            {
                await _l1.SetAsync(key, cached, new CacheEntryOptions(DateTimeOffset.UtcNow.Add(policy.AbsoluteExpiration), policy.SlidingExpiration), cancellationToken);
                return cached;
            }

            cached = await factory();
            if (cached is null) return default;

            var options = new CacheEntryOptions(DateTimeOffset.UtcNow.Add(policy.AbsoluteExpiration), policy.SlidingExpiration, "v1");
            await _l1.SetAsync(key, cached, options, cancellationToken);
            await _l2.SetAsync(key, cached, options, cancellationToken);
            return cached;
        }
        finally
        {
            gate.Release();
            _locks.TryRemove(key, out _);
        }
    }

    public Task RemoveAsync(string key, CancellationToken cancellationToken = default) =>
        Task.WhenAll(_l1.RemoveAsync(key, cancellationToken), _l2.RemoveAsync(key, cancellationToken));

    public Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default) =>
        Task.WhenAll(_l1.RemoveByPrefixAsync(prefix, cancellationToken), _l2.RemoveByPrefixAsync(prefix, cancellationToken));
}

public sealed class CacheInvalidationBus
{
    private readonly ConcurrentDictionary<string, Func<CacheInvalidationEvent, Task>> _handlers = new();

    public void Subscribe(string name, Func<CacheInvalidationEvent, Task> callback)
    {
        _handlers[name] = callback;
    }

    public async Task PublishAsync(CacheInvalidationEvent evt)
    {
        foreach (var handler in _handlers.Values)
        {
            await handler(evt);
        }
    }
}

public sealed class CatalogService
{
    private readonly HybridCacheService _cache;
    private readonly CacheInvalidationBus _bus;
    private readonly List<Product> _products = new();
    private readonly CachePolicy _listingPolicy = new(
        "product-list",
        TimeSpan.FromMinutes(15),
        TimeSpan.FromMinutes(5),
        CacheStrategy.CacheAside,
        true,
        true,
        500);

    private readonly CachePolicy _detailPolicy = new(
        "product-detail",
        TimeSpan.FromHours(12),
        TimeSpan.FromMinutes(30),
        CacheStrategy.StaleWhileRevalidate,
        true,
        true,
        2000);

    public CatalogService(HybridCacheService cache, CacheInvalidationBus bus)
    {
        _cache = cache;
        _bus = bus;

        _products.AddRange(new[]
        {
            new Product(1, "Cocoa Beans", 21.50m, 120, "Groceries", "Premium cocoa beans for wholesale sales.", DateTimeOffset.UtcNow),
            new Product(2, "Organic Tea", 18.00m, 90, "Beverages", "Organic black tea blend.", DateTimeOffset.UtcNow),
            new Product(3, "Bamboo Bowl", 14.99m, 45, "Home Goods", "Reusable bamboo serving bowl.", DateTimeOffset.UtcNow)
        });

        _bus.Subscribe("cache-prune", async evt =>
        {
            await _cache.RemoveByPrefixAsync($"products:{evt.EntityType}:");
        });
    }

    public async Task<IReadOnlyList<Product>> GetProductsAsync(ProductQuery query)
    {
        var key = CacheKeyBuilder.ProductList(query);
        return await _cache.GetOrCreateAsync(key, _listingPolicy, async () =>
        {
            await Task.Yield();
            return _products
                .Where(p => string.IsNullOrWhiteSpace(query.Search) || p.Name.Contains(query.Search, StringComparison.OrdinalIgnoreCase))
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToList();
        });
    }

    public async Task<Product?> GetProductAsync(int productId)
    {
        var key = CacheKeyBuilder.ProductDetail(productId);
        return await _cache.GetOrCreateAsync(key, _detailPolicy, async () =>
        {
            await Task.Yield();
            return _products.FirstOrDefault(p => p.Id == productId);
        });
    }

    public async Task UpdatePriceAsync(int productId, decimal newPrice)
    {
        var product = _products.FirstOrDefault(p => p.Id == productId);
        if (product is null)
        {
            throw new InvalidOperationException($"Product {productId} was not found.");
        }

        var updated = product with { Price = newPrice, UpdatedAtUtc = DateTimeOffset.UtcNow };
        var idx = _products.FindIndex(p => p.Id == productId);
        _products[idx] = updated;

        var evt = new CacheInvalidationEvent("product", productId.ToString(), "catalog", "v1", DateTimeOffset.UtcNow, "tenant-default", Guid.NewGuid().ToString("N"));
        await _cache.RemoveByPrefixAsync("products:");
        await _bus.PublishAsync(evt);
    }
}

public sealed class OfflineOrderQueue
{
    private readonly ConcurrentDictionary<string, PendingOrder> _pending = new(StringComparer.Ordinal);
    private readonly HashSet<string> _processedIdempotencyKeys = new(StringComparer.Ordinal);

    public Task QueuePendingOrderAsync(PendingOrder order)
    {
        if (_pending.ContainsKey(order.Id))
        {
            return Task.CompletedTask;
        }

        _pending[order.Id] = order with { Status = "PendingSynchronization" };
        return Task.CompletedTask;
    }

    public Task<OrderSyncResult> SyncPendingOrdersAsync()
    {
        foreach (var entry in _pending)
        {
            var order = entry.Value;
            if (_processedIdempotencyKeys.Contains(order.IdempotencyKey))
            {
                _pending.TryRemove(order.Id, out _);
                continue;
            }

            var valid = order.Lines.Count > 0 && order.Amount > 0m && !string.IsNullOrWhiteSpace(order.CustomerId);
            if (!valid)
            {
                _pending[order.Id] = order with { Status = "Rejected" };
                continue;
            }

            var finalTotal = order.Lines.Sum(line => line.UnitPrice * line.Quantity);
            _processedIdempotencyKeys.Add(order.IdempotencyKey);
            _pending.TryRemove(order.Id, out _);

            return Task.FromResult(new OrderSyncResult(order.Id, true, "Confirmed", finalTotal));
        }

        return Task.FromResult(new OrderSyncResult(Guid.NewGuid().ToString("N"), false, "NoPendingOrders", 0m));
    }
}

