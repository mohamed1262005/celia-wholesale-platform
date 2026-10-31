using System.Net;
using CeliaWholesale.Backend.Models;
using CeliaWholesale.Backend.Services;
using Xunit;

namespace CeliaWholesale.Backend.Tests;

public sealed class CatalogClientTests
{
    [Fact]
    public async Task GetProductsAsync_UsesSchemaFiltersAndParsesExactCount()
    {
        var handler = new RecordingHandler();
        using var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://example.supabase.co/rest/v1/")
        };
        httpClient.DefaultRequestHeaders.Add("apikey", "test-public-key");
        var client = new SupabaseCatalogClient(httpClient);

        var result = await client.GetProductsAsync(new ProductQuery(
            Search: "cocoa*",
            Page: 2,
            PageSize: 24,
            CategorySlug: "groceries",
            Availability: "available",
            Sort: "price_low"), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(42, result["count"]!.GetValue<long>());
        Assert.Equal("count=exact", handler.Request!.Headers.GetValues("Prefer").Single());

        var query = Uri.UnescapeDataString(handler.Request.RequestUri!.Query);
        Assert.Contains("categories!inner(*)", query);
        Assert.Contains("available_stock=gt.0", query);
        Assert.Contains("offset=24", query);
        Assert.Contains("limit=24", query);
        Assert.Contains("name_ar.ilike", query);
        Assert.True(query.Contains("cocoa", StringComparison.Ordinal), query);
        Assert.Contains("order=price.asc", query);
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Request = request;
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("[{\"id\":\"b4d7b4e8-a4c4-48b8-ae45-983f3d54b28f\"}]")
            };
            response.Content.Headers.TryAddWithoutValidation("Content-Range", "items 0-23/42");
            return Task.FromResult(response);
        }
    }
}
