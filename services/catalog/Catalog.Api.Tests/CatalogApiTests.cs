using Catalog.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Catalog.Api.Tests;

public class CatalogApiTests(CatalogApiFactory factory) : IClassFixture<CatalogApiFactory>
{
    [Fact]
    public async Task CreateProduct_WithoutToken_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        var categoryId = await GetAnyCategoryIdAsync(client);
        var response = await client.PostAsJsonAsync("/admin/products", new CreateProductRequest(categoryId, "A", "B", 100));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateProduct_WithUserRole_ReturnsForbidden()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken("2", "user"));
        var categoryId = await GetAnyCategoryIdAsync(client);
        var response = await client.PostAsJsonAsync("/admin/products", new CreateProductRequest(categoryId, "A", "B", 100));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PublishedProduct_IsVisibleInPublicProductsEndpoint()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken("1", "admin"));

        var categoryId = await GetAnyCategoryIdAsync(client);
        var create = await client.PostAsJsonAsync("/admin/products", new CreateProductRequest(categoryId, "Keyboard", "Mechanical", 12000));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<CreateProductResponse>();
        Assert.NotNull(created);

        var publish = await client.PostAsJsonAsync($"/admin/products/{created!.ProductId}/publish", new PublishProductRequest(true));
        Assert.Equal(HttpStatusCode.NoContent, publish.StatusCode);

        client.DefaultRequestHeaders.Authorization = null;
        var list = await client.GetFromJsonAsync<ProductListResponse>("/products?page=1&pageSize=20");
        Assert.NotNull(list);
        Assert.Contains(list!.Items, x => x.Id == created.ProductId);
    }

    [Fact]
    public async Task Inventory_IssueOverAvailable_ReturnsConflict()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken("1", "admin"));

        var categoryId = await GetAnyCategoryIdAsync(client);
        var create = await client.PostAsJsonAsync("/admin/products", new CreateProductRequest(categoryId, "Mouse", "Gaming", 5000));
        var created = await create.Content.ReadFromJsonAsync<CreateProductResponse>();
        Assert.NotNull(created);

        var receive = await client.PostAsJsonAsync("/admin/inventory/receive", new InventoryQuantityRequest(created!.ProductId, 10, 0, "init"));
        Assert.Equal(HttpStatusCode.NoContent, receive.StatusCode);

        var issue = await client.PostAsJsonAsync("/admin/inventory/issue", new InventoryQuantityRequest(created.ProductId, 11, 1, "over-issue"));
        Assert.Equal(HttpStatusCode.Conflict, issue.StatusCode);
    }

    [Fact]
    public async Task Inventory_WithStaleVersion_ReturnsConflict()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken("1", "admin"));

        var categoryId = await GetAnyCategoryIdAsync(client);
        var create = await client.PostAsJsonAsync("/admin/products", new CreateProductRequest(categoryId, "Display", "27-inch", 30000));
        var created = await create.Content.ReadFromJsonAsync<CreateProductResponse>();
        Assert.NotNull(created);

        var receive = await client.PostAsJsonAsync("/admin/inventory/receive", new InventoryQuantityRequest(created!.ProductId, 5, 0, "receive"));
        Assert.Equal(HttpStatusCode.NoContent, receive.StatusCode);

        var adjust = await client.PostAsJsonAsync("/admin/inventory/adjust", new InventoryAdjustRequest(created.ProductId, 20, 1, "adjust"));
        Assert.Equal(HttpStatusCode.NoContent, adjust.StatusCode);

        var staleIssue = await client.PostAsJsonAsync("/admin/inventory/issue", new InventoryQuantityRequest(created.ProductId, 1, 1, "stale"));
        Assert.Equal(HttpStatusCode.Conflict, staleIssue.StatusCode);
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

    private static async Task<Guid> GetAnyCategoryIdAsync(HttpClient client)
    {
        var categories = await client.GetFromJsonAsync<List<CategoryResponse>>("/categories");
        Assert.NotNull(categories);
        var first = categories!.FirstOrDefault();
        Assert.NotNull(first);
        return first!.Id;
    }

    public sealed record CreateProductRequest(Guid CategoryId, string Name, string Description, decimal Price);
    public sealed record CreateProductResponse(Guid ProductId);
    public sealed record PublishProductRequest(bool IsPublished);
    public sealed record InventoryQuantityRequest(Guid ProductId, int Quantity, int ExpectedVersion, string? Note);
    public sealed record InventoryAdjustRequest(Guid ProductId, int NewOnHand, int ExpectedVersion, string? Note);
    public sealed record ProductResponse(Guid Id, Guid CategoryId, string CategoryKey, string CategoryName, string Name, string Description, decimal Price, int OnHand, int Reserved, int Available, int Version);
    public sealed record ProductListResponse(List<ProductResponse> Items, int TotalCount, int Page, int PageSize, int TotalPages);
    public sealed record CategoryResponse(Guid Id, string Key, string Name, int SortOrder);
}

public class CatalogApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("CatalogDb:UseInMemory", "true");
    }
}
