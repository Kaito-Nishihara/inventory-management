using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace Chapter7.E2E.Tests;

/// <summary>
/// Docker Compose 上の Chapter 7 実通信E2Eを検証します。
/// </summary>
public sealed class Chapter7ComposeE2ETests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private static readonly string IdentityBaseUrl =
        Environment.GetEnvironmentVariable("CH7_IDENTITY_BASE_URL") ?? "http://localhost:5001";

    private static readonly string CatalogBaseUrl =
        Environment.GetEnvironmentVariable("CH7_CATALOG_BASE_URL") ?? "http://localhost:5002";

    private static readonly string OrderBaseUrl =
        Environment.GetEnvironmentVariable("CH7_ORDER_BASE_URL") ?? "http://localhost:5003";

    /// <summary>
    /// 注文作成から在庫引当・状態遷移までのE2Eを検証します。
    /// </summary>
    [Fact]
    public async Task Compose_GrpcFlow_Works_EndToEnd()
    {
        using var client = new HttpClient();

        await AssertHealthAsync(client, $"{IdentityBaseUrl}/health");
        await AssertHealthAsync(client, $"{CatalogBaseUrl}/health");
        await AssertHealthAsync(client, $"{OrderBaseUrl}/health");

        var adminToken = await LoginAndGetAccessTokenAsync(client, "admin@test.com", "password");
        var userToken = await LoginAndGetAccessTokenAsync(client, "user@test.com", "password");

        var productId = await CreateProductAsync(client, adminToken);
        await ReceiveInventoryAsync(client, adminToken, productId);

        var orderId = await CreateOrderAsync(client, userToken, productId, HttpStatusCode.Created);
        await CreateOrderAsync(client, userToken, productId, HttpStatusCode.Conflict);

        await ChangeOrderStatusAsync(client, adminToken, orderId, "shipped", HttpStatusCode.NoContent);
        await ChangeOrderStatusAsync(client, adminToken, orderId, "completed", HttpStatusCode.NoContent);
        await ChangeOrderStatusAsync(client, adminToken, orderId, "accepted", HttpStatusCode.Conflict);
    }

    private static async Task AssertHealthAsync(HttpClient client, string url)
    {
        Exception? lastException = null;

        for (var i = 0; i < 30; i++)
        {
            try
            {
                using var response = await client.GetAsync(url);
                if (response.StatusCode == HttpStatusCode.OK)
                {
                    return;
                }
            }
            catch (Exception ex)
            {
                lastException = ex;
            }

            await Task.Delay(TimeSpan.FromSeconds(2));
        }

        var detail = lastException is null ? "no response" : lastException.Message;
        throw new Xunit.Sdk.XunitException($"Health check failed: {url}. Last error: {detail}");
    }

    private static async Task<string> LoginAndGetAccessTokenAsync(HttpClient client, string email, string password)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{IdentityBaseUrl}/auth/login")
        {
            Content = JsonContent.Create(new { email, password })
        };

        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<AuthTokensResponse>(JsonOptions);
        Assert.NotNull(payload);
        Assert.False(string.IsNullOrWhiteSpace(payload!.AccessToken));
        return payload.AccessToken;
    }

    private static async Task<Guid> CreateProductAsync(HttpClient client, string adminToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{CatalogBaseUrl}/admin/products")
        {
            Content = JsonContent.Create(new
            {
                name = $"E2E Product {Guid.NewGuid():N}",
                description = "chapter7 compose grpc e2e",
                price = 12000
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<CreateProductResponse>(JsonOptions);
        Assert.NotNull(payload);
        Assert.NotEqual(Guid.Empty, payload!.ProductId);
        return payload.ProductId;
    }

    private static async Task ReceiveInventoryAsync(HttpClient client, string adminToken, Guid productId)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{CatalogBaseUrl}/admin/inventory/receive")
        {
            Content = JsonContent.Create(new
            {
                productId,
                quantity = 1,
                expectedVersion = 0,
                note = "chapter7-e2e-initial-stock"
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    private static async Task<Guid> CreateOrderAsync(HttpClient client, string userToken, Guid productId, HttpStatusCode expectedStatus)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{OrderBaseUrl}/orders")
        {
            Content = JsonContent.Create(new
            {
                productId,
                quantity = 1
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

        using var response = await client.SendAsync(request);
        Assert.Equal(expectedStatus, response.StatusCode);

        if (expectedStatus == HttpStatusCode.Created)
        {
            var payload = await response.Content.ReadFromJsonAsync<CreateOrderResponse>(JsonOptions);
            Assert.NotNull(payload);
            Assert.NotEqual(Guid.Empty, payload!.OrderId);
            return payload.OrderId;
        }

        return Guid.Empty;
    }

    private static async Task ChangeOrderStatusAsync(HttpClient client, string adminToken, Guid orderId, string nextStatus, HttpStatusCode expectedStatus)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{OrderBaseUrl}/admin/orders/{orderId}/status")
        {
            Content = JsonContent.Create(new { nextStatus })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        using var response = await client.SendAsync(request);
        Assert.Equal(expectedStatus, response.StatusCode);
    }

    private sealed record AuthTokensResponse(string AccessToken, string RefreshToken);
    private sealed record CreateProductResponse(Guid ProductId);
    private sealed record CreateOrderResponse(Guid OrderId);
}
