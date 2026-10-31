using System.Text.Json;
using CeliaWholesale.Backend.Models;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace CeliaWholesale.Backend.Services;

public interface ICacheInvalidationPublisher
{
    Task PublishAsync(CacheInvalidationEvent evt, CancellationToken cancellationToken = default);
}

public sealed class NoopCacheInvalidationPublisher : ICacheInvalidationPublisher
{
    public Task PublishAsync(CacheInvalidationEvent evt, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}

public sealed class RedisCacheInvalidationPublisher : ICacheInvalidationPublisher
{
    private const string ChannelName = "celia:cache:invalidation";
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisCacheInvalidationPublisher> _logger;

    public RedisCacheInvalidationPublisher(IConnectionMultiplexer redis, ILogger<RedisCacheInvalidationPublisher> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task PublishAsync(CacheInvalidationEvent evt, CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Serialize(evt);
        await _redis.GetSubscriber().PublishAsync(RedisChannel.Literal(ChannelName), payload);

        _logger.LogInformation(
            "Cache invalidation published: {EventType} {EntityType} {EntityId} {Scope} {Version}",
            evt.EventType,
            evt.EntityType,
            evt.EntityId,
            evt.Scope,
            evt.Version);
    }
}
