using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace CeliaWholesale.Backend.Services;

public sealed class SupabaseAdminAuthorizer(HttpClient httpClient)
{
    public async Task<bool> IsAdminAsync(string? authorizationHeader, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(authorizationHeader) ||
            !authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var accessToken = authorizationHeader[7..].Trim();
        if (accessToken.Length == 0)
        {
            return false;
        }

        using var userRequest = new HttpRequestMessage(HttpMethod.Get, "auth/v1/user");
        userRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var userResponse = await httpClient.SendAsync(userRequest, cancellationToken);
        if (!userResponse.IsSuccessStatusCode)
        {
            return false;
        }

        await using var userStream = await userResponse.Content.ReadAsStreamAsync(cancellationToken);
        using var userJson = await JsonDocument.ParseAsync(userStream, cancellationToken: cancellationToken);
        if (!userJson.RootElement.TryGetProperty("id", out var userIdElement) ||
            !Guid.TryParse(userIdElement.GetString(), out var userId))
        {
            return false;
        }

        var path = $"rest/v1/profiles?id=eq.{userId:D}&select=role,status&limit=1";
        using var profileRequest = new HttpRequestMessage(HttpMethod.Get, path);
        profileRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var profileResponse = await httpClient.SendAsync(profileRequest, cancellationToken);
        if (!profileResponse.IsSuccessStatusCode)
        {
            return false;
        }

        var profile = JsonNode.Parse(await profileResponse.Content.ReadAsStringAsync(cancellationToken))
            as JsonArray;
        return profile?.FirstOrDefault() is JsonObject row &&
               string.Equals(row["role"]?.GetValue<string>(), "admin", StringComparison.OrdinalIgnoreCase) &&
               string.Equals(row["status"]?.GetValue<string>(), "active", StringComparison.OrdinalIgnoreCase);
    }
}
