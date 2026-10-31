using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json.Nodes;
using CeliaWholesale.Backend.Models;

namespace CeliaWholesale.Backend.Services;

public sealed class SupabaseCatalogClient(HttpClient httpClient)
{
    public async Task<JsonObject?> GetProductsAsync(ProductQuery query, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var parameters = new List<string>
        {
            $"select=*,{(string.IsNullOrWhiteSpace(query.CategorySlug) ? "categories(*)" : "categories!inner(*)")},pricing_tiers(*)",
            $"limit={pageSize.ToString(CultureInfo.InvariantCulture)}",
            $"offset={((page - 1) * pageSize).ToString(CultureInfo.InvariantCulture)}",
            "order=sort_order.asc,created_at.desc,id.asc"
        };

        if (!string.IsNullOrWhiteSpace(query.CategoryId) && Guid.TryParse(query.CategoryId, out _))
        {
            parameters.Add($"category_id=eq.{Uri.EscapeDataString(query.CategoryId)}");
        }
        else if (!string.IsNullOrWhiteSpace(query.CategorySlug))
        {
            parameters.Add($"categories.slug=eq.{Uri.EscapeDataString(query.CategorySlug)}");
        }

        if (string.Equals(query.Availability, "available", StringComparison.OrdinalIgnoreCase))
        {
            parameters.Add("available_stock=gt.0");
        }

        var search = SanitizeSearch(query.Search);
        if (search.Length > 0)
        {
            var filter = $"(name_ar.ilike.*{search}*,name_en.ilike.*{search}*)";
            parameters.Add($"or={filter}");
        }

        var sort = query.Sort?.ToLowerInvariant() switch
        {
            "price_low" => "price.asc,sort_order.asc,id.asc",
            "price_high" => "price.desc,sort_order.asc,id.asc",
            "name" => "name_ar.asc,id.asc",
            _ => "created_at.desc,sort_order.asc,id.asc"
        };
        parameters[3] = $"order={sort}";

        var (rows, count) = await GetArrayAsync($"products?{string.Join('&', parameters)}", true, cancellationToken);
        return new JsonObject
        {
            ["rows"] = rows,
            ["count"] = count is null ? null : JsonValue.Create(count.Value)
        };
    }

    public async Task<JsonObject?> GetProductAsync(string productId, CancellationToken cancellationToken)
    {
        var (rows, _) = await GetArrayAsync(
            $"products?select=*,categories(*),pricing_tiers(*)&id=eq.{Uri.EscapeDataString(productId)}&limit=1",
            false,
            cancellationToken);
        return rows.FirstOrDefault() is JsonObject product ? (JsonObject)product.DeepClone() : null;
    }

    public async Task<JsonArray?> GetCategoriesAsync(CancellationToken cancellationToken)
    {
        var (rows, _) = await GetArrayAsync(
            "categories?select=*&order=name_ar.asc,id.asc",
            false,
            cancellationToken);
        return rows;
    }

    private async Task<(JsonArray Rows, long? Count)> GetArrayAsync(
        string path,
        bool includeCount,
        CancellationToken cancellationToken)
    {
        if (!httpClient.DefaultRequestHeaders.Contains("apikey"))
        {
            throw new InvalidOperationException("Configure Supabase:AnonKey with the project's public key before using catalog endpoints.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        if (includeCount)
        {
            request.Headers.Add("Prefer", "count=exact");
        }

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Supabase catalog request failed with status {(int)response.StatusCode}.",
                null,
                response.StatusCode);
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var rows = JsonNode.Parse(body) as JsonArray ?? new JsonArray();
        var count = includeCount && response.Content.Headers.TryGetValues("Content-Range", out var values)
            ? ParseCount(values.FirstOrDefault())
            : null;
        return (rows, count);
    }

    private static long? ParseCount(string? contentRange)
    {
        if (contentRange is null)
        {
            return null;
        }

        var separator = contentRange.LastIndexOf('/');
        return separator >= 0 && long.TryParse(contentRange[(separator + 1)..], out var count)
            ? count
            : null;
    }

    private static string SanitizeSearch(string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return string.Empty;
        }

        var sanitized = new string(search
            .Where(character => char.IsLetterOrDigit(character) || char.IsWhiteSpace(character) || character is '-' or '_')
            .ToArray());
        return string.Join(' ', sanitized.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }
}
