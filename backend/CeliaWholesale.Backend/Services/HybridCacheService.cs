using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using CeliaWholesale.Backend.Options;

namespace CeliaWholesale.Backend.Services;

public sealed class HybridCacheService
{
    private readonly IMemoryCache _memoryCache;
    private readonly IDistributedCache _distributedCache;
    private readonly IConnectionMultiplexer? _redis;
    private readonly string _redisInstanceName;
    private readonly ILogger<HybridCacheService> _logger;
    private readonly object _lockSync = new();
    private readonly Dictionary<string, KeyedLock> _locks = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, byte> _refreshingKeys = new();
    private readonly ConcurrentDictionary<string, long> _generations = new();
    private readonly ConcurrentDictionary<string, byte> _trackedMemoryKeys = new();

    public HybridCacheService(
        IMemoryCache memoryCache,
        IDistributedCache distributedCache,
        ILogger<HybridCacheService> logger,
        IConnectionMultiplexer? redis = null,
        IOptions<CacheOptions>? cacheOptions = null)
    {
        _memoryCache = memoryCache;
        _distributedCache = distributedCache;
        _redis = redis;
        _logger = logger;
        _redisInstanceName = cacheOptions?.Value.Redis.InstanceName ?? string.Empty;
    }

    public async Task<T?> GetOrCreateAsync<T>(
        string key,
        TimeSpan absoluteLifetime,
        TimeSpan slidingLifetime,
        Func<Task<T?>> factory,
        CancellationToken cancellationToken = default,
        TimeSpan? staleLifetime = null)
        where T : class
    {
        return await GetOrCreateAsync(
            key,
            absoluteLifetime,
            slidingLifetime,
            _ => factory(),
            cancellationToken,
            staleLifetime);
    }

    public async Task<T?> GetOrCreateAsync<T>(
        string key,
        TimeSpan absoluteLifetime,
        TimeSpan slidingLifetime,
        Func<CancellationToken, Task<T?>> factory,
        CancellationToken cancellationToken = default,
        TimeSpan? staleLifetime = null)
        where T : class
    {
        var staleWindow = staleLifetime ?? TimeSpan.FromMinutes(5);
        if (staleWindow < TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(staleLifetime));
        }

        if (TryGetMemoryValue<T>(key, absoluteLifetime, slidingLifetime, staleWindow, factory, out var cachedValue))
        {
            return cachedValue;
        }

        var distributedValue = await GetDistributedAsync<T>(key, cancellationToken);
        if (TryUseEnvelope(key, distributedValue, absoluteLifetime, slidingLifetime, staleWindow, factory, out cachedValue))
        {
            return cachedValue;
        }

        KeyedLock gate;
        lock (_lockSync)
        {
            if (!_locks.TryGetValue(key, out gate!))
            {
                gate = new KeyedLock();
                _locks.Add(key, gate);
            }
            gate.Users++;
        }

        var acquired = false;
        try
        {
            await gate.Semaphore.WaitAsync(cancellationToken);
            acquired = true;

            if (TryGetMemoryValue<T>(key, absoluteLifetime, slidingLifetime, staleWindow, factory, out cachedValue))
            {
                return cachedValue;
            }

            var distributedAgain = await GetDistributedAsync<T>(key, cancellationToken);
            if (TryUseEnvelope(key, distributedAgain, absoluteLifetime, slidingLifetime, staleWindow, factory, out cachedValue))
            {
                return cachedValue;
            }

            var value = await factory(cancellationToken);
            if (value is null)
            {
                return null;
            }

            await StoreEnvelopeAsync(key, CreateEnvelope(value, absoluteLifetime, staleWindow), slidingLifetime, cancellationToken);
            return value;
        }
        finally
        {
            if (acquired)
            {
                gate.Semaphore.Release();
            }

            lock (_lockSync)
            {
                gate.Users--;
                if (gate.Users == 0)
                {
                    _locks.Remove(key);
                    gate.Semaphore.Dispose();
                }
            }
        }
    }

    private bool TryGetMemoryValue<T>(
        string key,
        TimeSpan absoluteLifetime,
        TimeSpan slidingLifetime,
        TimeSpan staleWindow,
        Func<CancellationToken, Task<T?>> factory,
        out T? value)
        where T : class
    {
        if (_memoryCache.TryGetValue(key, out CacheEnvelope<T>? envelope) && envelope is not null)
        {
            return TryUseEnvelope(key, envelope, absoluteLifetime, slidingLifetime, staleWindow, factory, out value);
        }

        value = null;
        return false;
    }

    private bool TryUseEnvelope<T>(
        string key,
        CacheEnvelope<T>? envelope,
        TimeSpan absoluteLifetime,
        TimeSpan slidingLifetime,
        TimeSpan staleWindow,
        Func<CancellationToken, Task<T?>> factory,
        out T? value)
        where T : class
    {
        if (envelope is null || envelope.Value is null || envelope.StaleUntilUtc <= DateTimeOffset.UtcNow)
        {
            value = null;
            return false;
        }

        SetMemoryValue(key, envelope, slidingLifetime);
        if (envelope.FreshUntilUtc <= DateTimeOffset.UtcNow)
        {
            ScheduleRefresh(key, absoluteLifetime, slidingLifetime, staleWindow, factory);
        }

        value = envelope.Value;
        return true;
    }

    private void ScheduleRefresh<T>(
        string key,
        TimeSpan absoluteLifetime,
        TimeSpan slidingLifetime,
        TimeSpan staleWindow,
        Func<CancellationToken, Task<T?>> factory)
        where T : class
    {
        var generation = _generations.GetOrAdd(key, 0);
        if (!_refreshingKeys.TryAdd(key, 1))
        {
            return;
        }

        _ = Task.Run(async () =>
        {
            try
            {
                var refreshedValue = await factory(CancellationToken.None);
                if (refreshedValue is null || _generations.GetOrAdd(key, 0) != generation)
                {
                    return;
                }

                await StoreEnvelopeAsync(key, CreateEnvelope(refreshedValue, absoluteLifetime, staleWindow), slidingLifetime, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Background cache refresh failed for key {CacheKey}", key);
            }
            finally
            {
                _refreshingKeys.TryRemove(key, out _);
            }
        });
    }

    private void SetMemoryValue<T>(string key, CacheEnvelope<T> envelope, TimeSpan slidingLifetime)
        where T : class
    {
        _memoryCache.Set(key, envelope, new MemoryCacheEntryOptions
        {
            AbsoluteExpiration = envelope.StaleUntilUtc,
            SlidingExpiration = slidingLifetime
        });
        _trackedMemoryKeys[key] = 1;
    }

    private static CacheEnvelope<T> CreateEnvelope<T>(T value, TimeSpan freshLifetime, TimeSpan staleWindow)
        where T : class
    {
        var freshUntil = DateTimeOffset.UtcNow + freshLifetime;
        return new CacheEnvelope<T>(value, freshUntil, freshUntil + staleWindow);
    }

    private async Task StoreEnvelopeAsync<T>(
        string key,
        CacheEnvelope<T> envelope,
        TimeSpan slidingLifetime,
        CancellationToken cancellationToken)
        where T : class
    {
        SetMemoryValue(key, envelope, slidingLifetime);
        try
        {
            var bytes = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(envelope);
            await _distributedCache.SetAsync(key, bytes, new DistributedCacheEntryOptions
            {
                AbsoluteExpiration = envelope.StaleUntilUtc
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Distributed cache write failed for key {CacheKey}", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        _generations.AddOrUpdate(key, 1, static (_, generation) => generation + 1);
        _memoryCache.Remove(key);
        _trackedMemoryKeys.TryRemove(key, out _);
        await _distributedCache.RemoveAsync(key, cancellationToken);
    }

    public async Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default)
    {
        var trackedKeys = _trackedMemoryKeys.Keys
            .Concat(_refreshingKeys.Keys)
            .Where(key => key.StartsWith(prefix, StringComparison.Ordinal))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        foreach (var key in trackedKeys)
        {
            _memoryCache.Remove(key);
            _trackedMemoryKeys.TryRemove(key, out _);
            await _distributedCache.RemoveAsync(key, cancellationToken);
        }

        if (_redis is not null)
        {
            var db = _redis.GetDatabase();
            foreach (var endpoint in _redis.GetEndPoints())
            {
                cancellationToken.ThrowIfCancellationRequested();
                var server = _redis.GetServer(endpoint);
                if (!server.IsConnected)
                {
                    continue;
                }

                var redisKeys = server.Keys(database: db.Database, pattern: $"{_redisInstanceName}{prefix}*").ToArray();
                if (redisKeys.Length > 0)
                {
                    await db.KeyDeleteAsync(redisKeys);
                }
            }
        }
    }

    private async Task<CacheEnvelope<T>?> GetDistributedAsync<T>(string key, CancellationToken cancellationToken) where T : class
    {
        try
        {
            var payload = await _distributedCache.GetAsync(key, cancellationToken);
            if (payload is null)
            {
                return null;
            }

            return System.Text.Json.JsonSerializer.Deserialize<CacheEnvelope<T>>(payload);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Distributed cache read failed for key {CacheKey}", key);
            return null;
        }
    }

    private sealed record CacheEnvelope<T>(T Value, DateTimeOffset FreshUntilUtc, DateTimeOffset StaleUntilUtc)
        where T : class;

    private sealed class KeyedLock
    {
        public SemaphoreSlim Semaphore { get; } = new(1, 1);
        public int Users { get; set; }
    }
}
