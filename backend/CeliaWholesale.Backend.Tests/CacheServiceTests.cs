using CeliaWholesale.Backend.Models;
using CeliaWholesale.Backend.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CeliaWholesale.Backend.Tests;

public sealed class CacheServiceTests
{
    [Fact]
    public async Task GetOrCreateAsync_ReturnsCachedValue_OnSecondRead()
    {
        var memory = new MemoryCache(new MemoryCacheOptions());
        var distributed = new DummyDistributedCache();
        var cache = new HybridCacheService(memory, distributed, NullLogger<HybridCacheService>.Instance);

        var first = await cache.GetOrCreateAsync(
            "demo:key",
            TimeSpan.FromMinutes(10),
            TimeSpan.FromMinutes(2),
            () => Task.FromResult<string?>("first-value"));

        var second = await cache.GetOrCreateAsync(
            "demo:key",
            TimeSpan.FromMinutes(10),
            TimeSpan.FromMinutes(2),
            () => Task.FromResult<string?>("second-value"));

        Assert.Equal("first-value", first);
        Assert.Equal("first-value", second);
    }

    [Fact]
    public async Task GetOrCreateAsync_ReadsEnvelopeFromDistributedCacheAcrossInstances()
    {
        var distributed = new DummyDistributedCache();
        var firstCache = new HybridCacheService(
            new MemoryCache(new MemoryCacheOptions()),
            distributed,
            NullLogger<HybridCacheService>.Instance);
        await firstCache.GetOrCreateAsync(
            "shared:key",
            TimeSpan.FromMinutes(10),
            TimeSpan.FromMinutes(2),
            () => Task.FromResult<string?>("distributed-value"));

        var secondCache = new HybridCacheService(
            new MemoryCache(new MemoryCacheOptions()),
            distributed,
            NullLogger<HybridCacheService>.Instance);
        var result = await secondCache.GetOrCreateAsync(
            "shared:key",
            TimeSpan.FromMinutes(10),
            TimeSpan.FromMinutes(2),
            () => Task.FromResult<string?>("should-not-be-created"));

        Assert.Equal("distributed-value", result);
    }

    [Fact]
    public async Task RemoveByPrefixAsync_RemovesTrackedMemoryEntries()
    {
        var memory = new MemoryCache(new MemoryCacheOptions());
        var distributed = new DummyDistributedCache();
        var cache = new HybridCacheService(memory, distributed, NullLogger<HybridCacheService>.Instance);

        await cache.GetOrCreateAsync("products:list:one", TimeSpan.FromMinutes(10), TimeSpan.FromMinutes(2),
            () => Task.FromResult<string?>("one"));
        await cache.GetOrCreateAsync("categories:list:one", TimeSpan.FromMinutes(10), TimeSpan.FromMinutes(2),
            () => Task.FromResult<string?>("two"));

        await cache.RemoveByPrefixAsync("products:");

        var replacement = await cache.GetOrCreateAsync("products:list:one", TimeSpan.FromMinutes(10), TimeSpan.FromMinutes(2),
            () => Task.FromResult<string?>("replacement"));
        var unaffected = await cache.GetOrCreateAsync("categories:list:one", TimeSpan.FromMinutes(10), TimeSpan.FromMinutes(2),
            () => Task.FromResult<string?>("replacement"));

        Assert.Equal("replacement", replacement);
        Assert.Equal("two", unaffected);
    }

    [Fact]
    public async Task GetOrCreateAsync_ReturnsStaleValueWhileRefreshingInBackground()
    {
        var memory = new MemoryCache(new MemoryCacheOptions());
        var distributed = new DummyDistributedCache();
        var cache = new HybridCacheService(memory, distributed, NullLogger<HybridCacheService>.Instance);
        var refreshStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var finishRefresh = new TaskCompletionSource<string?>(TaskCreationOptions.RunContinuationsAsynchronously);

        await cache.GetOrCreateAsync(
            "swr:key",
            TimeSpan.FromMilliseconds(20),
            TimeSpan.FromSeconds(5),
            () => Task.FromResult<string?>("stale-value"),
            staleLifetime: TimeSpan.FromMinutes(1));

        await Task.Delay(50);
        var stale = await cache.GetOrCreateAsync(
            "swr:key",
            TimeSpan.FromMilliseconds(20),
            TimeSpan.FromSeconds(5),
            _ =>
            {
                refreshStarted.TrySetResult();
                return finishRefresh.Task;
            },
            staleLifetime: TimeSpan.FromMinutes(1));

        Assert.Equal("stale-value", stale);
        await refreshStarted.Task.WaitAsync(TimeSpan.FromSeconds(2));
        finishRefresh.SetResult("fresh-value");

        string? current = null;
        for (var attempt = 0; attempt < 20 && current != "fresh-value"; attempt++)
        {
            await Task.Delay(10);
            current = await cache.GetOrCreateAsync(
                "swr:key",
                TimeSpan.FromMinutes(1),
                TimeSpan.FromSeconds(5),
                () => Task.FromResult<string?>("unexpected-value"),
                staleLifetime: TimeSpan.FromMinutes(1));
        }

        Assert.Equal("fresh-value", current);
    }

    [Fact]
    public async Task RemoveAsync_PreventsBackgroundRefreshFromRestoringInvalidatedValue()
    {
        var memory = new MemoryCache(new MemoryCacheOptions());
        var distributed = new DummyDistributedCache();
        var cache = new HybridCacheService(memory, distributed, NullLogger<HybridCacheService>.Instance);
        var refreshStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var finishRefresh = new TaskCompletionSource<string?>(TaskCreationOptions.RunContinuationsAsynchronously);

        await cache.GetOrCreateAsync(
            "swr:invalidated",
            TimeSpan.FromMilliseconds(20),
            TimeSpan.FromSeconds(5),
            () => Task.FromResult<string?>("old-value"),
            staleLifetime: TimeSpan.FromMinutes(1));
        await Task.Delay(50);
        await cache.GetOrCreateAsync(
            "swr:invalidated",
            TimeSpan.FromMilliseconds(20),
            TimeSpan.FromSeconds(5),
            _ =>
            {
                refreshStarted.TrySetResult();
                return finishRefresh.Task;
            },
            staleLifetime: TimeSpan.FromMinutes(1));

        await refreshStarted.Task.WaitAsync(TimeSpan.FromSeconds(2));
        await cache.RemoveAsync("swr:invalidated");
        finishRefresh.SetResult("obsolete-value");
        await Task.Delay(50);

        var current = await cache.GetOrCreateAsync(
            "swr:invalidated",
            TimeSpan.FromMinutes(1),
            TimeSpan.FromSeconds(5),
            () => Task.FromResult<string?>("replacement-value"),
            staleLifetime: TimeSpan.FromMinutes(1));

        Assert.Equal("replacement-value", current);
    }

    private sealed class DummyDistributedCache : IDistributedCache
    {
        private readonly Dictionary<string, byte[]> _entries = new(StringComparer.Ordinal);

        public byte[]? Get(string key) => _entries.TryGetValue(key, out var value) ? value : null;

        public Task<byte[]?> GetAsync(string key, CancellationToken token = default)
            => Task.FromResult(_entries.TryGetValue(key, out var value) ? value : null);

        public void Refresh(string key) { }
        public Task RefreshAsync(string key, CancellationToken token = default) => Task.CompletedTask;

        public void Remove(string key) => _entries.Remove(key);
        public Task RemoveAsync(string key, CancellationToken token = default)
        {
            _entries.Remove(key);
            return Task.CompletedTask;
        }

        public void Set(string key, byte[] value, DistributedCacheEntryOptions options) => _entries[key] = value;
        public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default)
        {
            _entries[key] = value;
            return Task.CompletedTask;
        }
    }
}
