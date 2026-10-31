namespace CeliaWholesale.Backend.Models;

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
    string? CategoryId = null,
    string? CategorySlug = null,
    string? Availability = "all",
    string? Sort = "newest");

public sealed record Category(
    int Id,
    string Name,
    string Slug,
    DateTimeOffset UpdatedAtUtc);

public sealed record CacheInvalidationEvent(
    string EventType,
    string EntityType,
    string EntityId,
    string Scope,
    string Version,
    DateTimeOffset OccurredAtUtc,
    string? TenantId = null,
    string? CorrelationId = null);

public sealed record CacheInvalidationRequest(string EntityType, string? EntityId = null);

