using CeliaWholesale.Backend.Models;
using CeliaWholesale.Backend.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Nodes;

namespace CeliaWholesale.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class CatalogController : ControllerBase
{
    private readonly CatalogService _catalogService;
    private readonly HybridCacheService _cacheService;
    private readonly ICacheInvalidationPublisher _invalidationPublisher;
    private readonly SupabaseAdminAuthorizer _adminAuthorizer;

    public CatalogController(
        CatalogService catalogService,
        HybridCacheService cacheService,
        ICacheInvalidationPublisher invalidationPublisher,
        SupabaseAdminAuthorizer adminAuthorizer)
    {
        _catalogService = catalogService;
        _cacheService = cacheService;
        _invalidationPublisher = invalidationPublisher;
        _adminAuthorizer = adminAuthorizer;
    }

    [HttpGet("products")]
    public async Task<ActionResult<JsonObject>> GetProducts([FromQuery] ProductQuery query, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _catalogService.GetProductsAsync(query, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(statusCode: StatusCodes.Status503ServiceUnavailable, detail: ex.Message);
        }
        catch (HttpRequestException)
        {
            return Problem(statusCode: StatusCodes.Status502BadGateway, detail: "The catalog data source rejected or could not complete the request.");
        }
    }

    [HttpGet("products/{productId}")]
    public async Task<ActionResult<JsonObject>> GetProduct(string productId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _catalogService.GetProductAsync(productId, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(statusCode: StatusCodes.Status503ServiceUnavailable, detail: ex.Message);
        }
        catch (HttpRequestException)
        {
            return Problem(statusCode: StatusCodes.Status502BadGateway, detail: "The catalog data source rejected or could not complete the request.");
        }
    }

    [HttpGet("categories")]
    public async Task<ActionResult<JsonArray>> GetCategories(CancellationToken cancellationToken)
    {
        try
        {
            var result = await _catalogService.GetCategoriesAsync(cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(statusCode: StatusCodes.Status503ServiceUnavailable, detail: ex.Message);
        }
        catch (HttpRequestException)
        {
            return Problem(statusCode: StatusCodes.Status502BadGateway, detail: "The catalog data source rejected or could not complete the request.");
        }
    }

    [HttpPost("invalidation")]
    public async Task<IActionResult> InvalidateCatalog(
        [FromBody] CacheInvalidationRequest request,
        CancellationToken cancellationToken)
    {
        bool isAdmin;
        try
        {
            isAdmin = await _adminAuthorizer.IsAdminAsync(Request.Headers.Authorization.ToString(), cancellationToken);
        }
        catch (HttpRequestException)
        {
            return Problem(statusCode: StatusCodes.Status503ServiceUnavailable, detail: "Could not verify the administrator session.");
        }

        if (!isAdmin)
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.EntityType))
        {
            return BadRequest(new { message = "Entity type is required." });
        }

        var entityType = request.EntityType.Trim().ToLowerInvariant();
        if (entityType is not ("product" or "category" or "catalog"))
        {
            return BadRequest(new { message = "Entity type must be product, category, or catalog." });
        }

        if (entityType == "product" && Guid.TryParse(request.EntityId, out _))
        {
            await _cacheService.RemoveAsync($"products:detail:v1:{request.EntityId}", cancellationToken);
        }

        if (entityType is "product" or "category" or "catalog")
        {
            await _cacheService.RemoveByPrefixAsync("products:", cancellationToken);
        }

        if (entityType is "category" or "catalog")
        {
            await _cacheService.RemoveAsync("categories:list:v1", cancellationToken);
        }

        await _invalidationPublisher.PublishAsync(new CacheInvalidationEvent(
            "CatalogChanged",
            entityType,
            request.EntityId ?? string.Empty,
            "product-catalog",
            "v1",
            DateTimeOffset.UtcNow,
            CorrelationId: Guid.NewGuid().ToString("N")), cancellationToken);

        return NoContent();
    }
}
