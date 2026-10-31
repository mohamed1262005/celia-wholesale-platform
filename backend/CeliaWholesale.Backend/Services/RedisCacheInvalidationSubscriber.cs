using System.Text.Json;
using CeliaWholesale.Backend.Models;
using Microsoft.Extensions.Hosting;
using StackExchange.Redis;

namespace CeliaWholesale.Backend.Services;

public sealed class RedisCacheInvalidationSubscriber : BackgroundService
{
    private const string ChannelName = "celia:cache:invalidation";
    private readonly IConnectionMultiplexer _redis;
    private readonly HybridCacheService _cacheService;
    private readonly ILogger<RedisCacheInvalidationSubscriber> _logger;

    public RedisCacheInvalidationSubscriber(
        IConnectionMultiplexer redis,
        HybridCacheService cacheService,
        ILogger<RedisCacheInvalidationSubscriber> logger)
    {
        _redis = redis;
        _cacheService = cacheService;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var subscriber = _redis.GetSubscriber();

        await subscriber.SubscribeAsync(RedisChannel.Literal(ChannelName), async (channel, payload) =>
        {
            try
            {
                var evt = JsonSerializer.Deserialize<CacheInvalidationEvent>(payload!);
                if (evt is null)
                {
                    return;
                }

                if (!string.IsNullOrWhiteSpace(evt.EntityId))
                {
                    await _cacheService.RemoveAsync($"products:detail:v1:{evt.EntityId}", stoppingToken);
                }

                if (evt.EntityType.Equals("product", StringComparison.OrdinalIgnoreCase))
                {
                    await _cacheService.RemoveByPrefixAsync("products:list:", stoppingToken);
                }
                else if (evt.EntityType.Equals("category", StringComparison.OrdinalIgnoreCase))
                {
                    await _cacheService.RemoveAsync("categories:list:v1", stoppingToken);
                    await _cacheService.RemoveByPrefixAsync("products:", stoppingToken);
                }
                else if (evt.EntityType.Equals("catalog", StringComparison.OrdinalIgnoreCase))
                {
                    await _cacheService.RemoveAsync("categories:list:v1", stoppingToken);
                    await _cacheService.RemoveByPrefixAsync("products:", stoppingToken);
                }

                _logger.LogInformation(
                    "Redis invalidation consumed for entity {EntityType}/{EntityId} scope {Scope}",
                    evt.EntityType,
                    evt.EntityId,
                    evt.Scope);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to process invalidation message from Redis");
            }
        });

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}
