using Microsoft.AspNetCore.Mvc.Testing;
using Backend.Validation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Order.Api.Infrastructure.Clients;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Order.Api.Tests;

public class OrderApiTests(OrderApiFactory factory) : IClassFixture<OrderApiFactory>
{
    [Fact]
    public async Task CreateOrder_Success_ReturnsCreated()
    {
        factory.Gateway.SetReserveResult(new ReserveResult(true, string.Empty));

        using var client = CreateUserClient();
        var response = await client.PostAsJsonAsync("/orders", new CreateOrderRequest(Guid.NewGuid(), 2));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateOrder_WhenInventoryUnavailable_ReturnsConflict()
    {
        factory.Gateway.SetReserveResult(new ReserveResult(false, "insufficient_available"));

        using var client = CreateUserClient();
        var response = await client.PostAsJsonAsync("/orders", new CreateOrderRequest(Guid.NewGuid(), 2));
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(ApiErrorCodes.InsufficientAvailable, doc.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task ChangeStatus_ValidFlow_Works_And_InvalidTransitionReturnsConflict()
    {
        factory.Gateway.SetReserveResult(new ReserveResult(true, string.Empty));
        factory.Gateway.SetReleaseResult(new ReleaseResult(true, string.Empty));

        Guid orderId;
        using (var userClient = CreateUserClient())
        {
            var create = await userClient.PostAsJsonAsync("/orders", new CreateOrderRequest(Guid.NewGuid(), 1));
            var payload = await create.Content.ReadFromJsonAsync<CreateOrderResponse>();
            Assert.NotNull(payload);
            orderId = payload!.OrderId;
        }

        using var adminClient = CreateAdminClient();
        var shipped = await adminClient.PostAsJsonAsync($"/admin/orders/{orderId}/status", new ChangeOrderStatusRequest("shipped"));
        Assert.Equal(HttpStatusCode.NoContent, shipped.StatusCode);

        var completed = await adminClient.PostAsJsonAsync($"/admin/orders/{orderId}/status", new ChangeOrderStatusRequest("completed"));
        Assert.Equal(HttpStatusCode.NoContent, completed.StatusCode);

        var invalid = await adminClient.PostAsJsonAsync($"/admin/orders/{orderId}/status", new ChangeOrderStatusRequest("accepted"));
        Assert.Equal(HttpStatusCode.Conflict, invalid.StatusCode);
        using var invalidDoc = JsonDocument.Parse(await invalid.Content.ReadAsStringAsync());
        Assert.Equal(ApiErrorCodes.InvalidTransition, invalidDoc.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task ChangeStatus_Cancel_RequiresInventoryRelease()
    {
        factory.Gateway.SetReserveResult(new ReserveResult(true, string.Empty));
        factory.Gateway.SetReleaseResult(new ReleaseResult(false, "concurrency_conflict"));

        Guid orderId;
        using (var userClient = CreateUserClient())
        {
            var create = await userClient.PostAsJsonAsync("/orders", new CreateOrderRequest(Guid.NewGuid(), 1));
            var payload = await create.Content.ReadFromJsonAsync<CreateOrderResponse>();
            Assert.NotNull(payload);
            orderId = payload!.OrderId;
        }

        using var adminClient = CreateAdminClient();
        var cancel = await adminClient.PostAsJsonAsync($"/admin/orders/{orderId}/status", new ChangeOrderStatusRequest("cancelled"));
        Assert.Equal(HttpStatusCode.Conflict, cancel.StatusCode);
    }

    [Fact]
    public async Task ChangeStatus_WithUserRole_ReturnsForbidden()
    {
        factory.Gateway.SetReserveResult(new ReserveResult(true, string.Empty));

        Guid orderId;
        using (var userClient = CreateUserClient())
        {
            var create = await userClient.PostAsJsonAsync("/orders", new CreateOrderRequest(Guid.NewGuid(), 1));
            var payload = await create.Content.ReadFromJsonAsync<CreateOrderResponse>();
            Assert.NotNull(payload);
            orderId = payload!.OrderId;
        }

        using var userClientForAdminEndpoint = CreateUserClient();
        var response = await userClientForAdminEndpoint.PostAsJsonAsync(
            $"/admin/orders/{orderId}/status",
            new ChangeOrderStatusRequest("shipped"));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetById_IncludesStatusHistories()
    {
        factory.Gateway.SetReserveResult(new ReserveResult(true, string.Empty));
        factory.Gateway.SetReleaseResult(new ReleaseResult(true, string.Empty));

        Guid orderId;
        using (var userClient = CreateUserClient())
        {
            var create = await userClient.PostAsJsonAsync("/orders", new CreateOrderRequest(Guid.NewGuid(), 1));
            var payload = await create.Content.ReadFromJsonAsync<CreateOrderResponse>();
            Assert.NotNull(payload);
            orderId = payload!.OrderId;
        }

        using (var adminClient = CreateAdminClient())
        {
            var ship = await adminClient.PostAsJsonAsync($"/admin/orders/{orderId}/status", new ChangeOrderStatusRequest("shipped"));
            Assert.Equal(HttpStatusCode.NoContent, ship.StatusCode);
        }

        using var detailClient = CreateAdminClient();
        var detail = await detailClient.GetFromJsonAsync<OrderResponse>($"/orders/{orderId}");
        Assert.NotNull(detail);
        Assert.NotNull(detail!.StatusHistories);
        Assert.True(detail.StatusHistories.Count >= 2);
        Assert.Equal("shipped", detail.StatusHistories.First().Status);
    }

    private HttpClient CreateUserClient()
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken("10", "user"));
        return client;
    }

    private HttpClient CreateAdminClient()
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken("1", "admin"));
        return client;
    }

    private static string GenerateToken(string userId, string role)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSettings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public sealed record CreateOrderRequest(Guid ProductId, int Quantity);
    public sealed record CreateOrderResponse(Guid OrderId);
    public sealed record ChangeOrderStatusRequest(string NextStatus);
    public sealed record OrderResponse(Guid Id, string UserId, string Status, DateTime CreatedAtUtc, DateTime UpdatedAtUtc, IReadOnlyList<OrderItemResponse> Items, IReadOnlyList<OrderStatusHistoryResponse> StatusHistories);
    public sealed record OrderItemResponse(Guid ProductId, int Quantity);
    public sealed record OrderStatusHistoryResponse(Guid Id, string Status, string Note, DateTime CreatedAtUtc);
}

public class OrderApiFactory : WebApplicationFactory<Program>
{
    public FakeInventoryReservationGateway Gateway { get; } = new();

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("OrderDb:UseInMemory", "true");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IInventoryReservationGateway>();
            services.AddSingleton<IInventoryReservationGateway>(Gateway);
        });
    }
}

public class FakeInventoryReservationGateway : IInventoryReservationGateway
{
    private ReserveResult _reserveResult = new(true, string.Empty);
    private ReleaseResult _releaseResult = new(true, string.Empty);

    public void SetReserveResult(ReserveResult result)
    {
        _reserveResult = result;
    }

    public void SetReleaseResult(ReleaseResult result)
    {
        _releaseResult = result;
    }

    public Task<ReserveResult> ReserveAsync(Guid productId, int quantity, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_reserveResult);
    }

    public Task<ReleaseResult> ReleaseAsync(Guid productId, int quantity, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_releaseResult);
    }
}
