using CeliaWholesale.Backend.Models;
using System.Text.Json.Nodes;

namespace CeliaWholesale.Backend.Services;

public sealed class CatalogService
{
    private readonly HybridCacheService _cache;
    private readonly SupabaseCatalogClient _catalogClient;

    public CatalogService(HybridCacheService cache, SupabaseCatalogClient catalogClient)
    {
        _cache = cache;
        _catalogClient = catalogClient;
    }

    public async Task<JsonObject> GetProductsAsync(ProductQuery query, CancellationToken cancellationToken = default)
    {
        var key = BuildProductListKey(query);
        return await _cache.GetOrCreateAsync<JsonObject>(
            key,
            TimeSpan.FromMinutes(15),
            TimeSpan.FromMinutes(5),
            token => _catalogClient.GetProductsAsync(query, token),
            cancellationToken) ?? new JsonObject { ["rows"] = new JsonArray(), ["count"] = null };
    }

    public Task<JsonObject?> GetProductAsync(string productId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(productId, out _))
        {
            return Task.FromResult<JsonObject?>(null);
        }

        var key = $"products:detail:v1:{productId}";
        return _cache.GetOrCreateAsync<JsonObject>(
            key,
            TimeSpan.FromHours(12),
            TimeSpan.FromMinutes(30),
            token => _catalogClient.GetProductAsync(productId, token),
            cancellationToken);
    }

    public async Task<JsonArray> GetCategoriesAsync(CancellationToken cancellationToken = default)
    {
        return await _cache.GetOrCreateAsync<JsonArray>(
            "categories:list:v1",
            TimeSpan.FromHours(24),
            TimeSpan.FromMinutes(15),
            token => _catalogClient.GetCategoriesAsync(token),
            cancellationToken) ?? new JsonArray();
    }

    private static string BuildProductListKey(ProductQuery query)
    {
        return $"products:list:v1:{query.CategoryId}:{query.CategorySlug}:{query.Availability}:{query.Sort}:{query.Search}:{query.Page}:{query.PageSize}";
    }
}
