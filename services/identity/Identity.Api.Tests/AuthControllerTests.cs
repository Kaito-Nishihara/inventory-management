using Identity.Api.Infrastructure;
using Backend.Validation;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Xunit;

namespace Identity.Api.Tests;

public class AuthControllerTests(IdentityApiFactory factory) : IClassFixture<IdentityApiFactory>
{
    [Fact]
    public async Task Register_StoresHashedPassword_AndLoginReturnsJwt()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        var email = $"user_{Guid.NewGuid():N}@test.com";
        const string plainPassword = "P@ssw0rd123!";

        var registerResponse = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, plainPassword));
        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
            var savedUser = await db.Users.SingleOrDefaultAsync(x => x.Email == email);

            Assert.NotNull(savedUser);
            Assert.False(string.IsNullOrWhiteSpace(savedUser!.PasswordHash));
            Assert.NotEqual(plainPassword, savedUser.PasswordHash);
        }

        var loginResponse = await client.PostAsJsonAsync("/auth/login", new LoginRequest(email, plainPassword));
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var payload = await loginResponse.Content.ReadFromJsonAsync<AuthTokensResponse>();
        Assert.NotNull(payload);
        Assert.False(string.IsNullOrWhiteSpace(payload!.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(payload!.RefreshToken));
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        var response = await client.PostAsJsonAsync("/auth/login", new LoginRequest("wrong@test.com", "invalid"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(ApiErrorCodes.InvalidCredentials, doc.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Register_InvalidPayload_ReturnsValidationProblemDetails()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        var response = await client.PostAsJsonAsync("/auth/register", new RegisterRequest("", "short"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(ApiErrorCodes.ValidationError, doc.RootElement.GetProperty("code").GetString());
        Assert.True(doc.RootElement.GetProperty("errors").TryGetProperty("Email", out _));
    }

    [Fact]
    public async Task Refresh_ThenRevoke_ThenRefreshAgain_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        var email = $"refresh_{Guid.NewGuid():N}@test.com";
        const string plainPassword = "P@ssw0rd123!";

        var registerResponse = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, plainPassword));
        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);

        var loginResponse = await client.PostAsJsonAsync("/auth/login", new LoginRequest(email, plainPassword));
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<AuthTokensResponse>();
        Assert.NotNull(loginPayload);

        var refreshResponse = await client.PostAsJsonAsync("/auth/refresh", new RefreshRequest(loginPayload!.RefreshToken));
        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);
        var refreshedPayload = await refreshResponse.Content.ReadFromJsonAsync<AuthTokensResponse>();
        Assert.NotNull(refreshedPayload);

        var revokeResponse = await client.PostAsJsonAsync("/auth/revoke", new RevokeRequest(refreshedPayload!.RefreshToken));
        Assert.Equal(HttpStatusCode.NoContent, revokeResponse.StatusCode);

        var refreshAfterRevoke = await client.PostAsJsonAsync("/auth/refresh", new RefreshRequest(refreshedPayload.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, refreshAfterRevoke.StatusCode);
    }

    [Fact]
    public async Task AdminAuthAuditLogs_AdminCanList_AndUserIsForbidden()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        var failLogin = await client.PostAsJsonAsync("/auth/login", new LoginRequest("notfound@test.com", "invalid"));
        Assert.Equal(HttpStatusCode.Unauthorized, failLogin.StatusCode);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken("1", "admin"));
        var adminResponse = await client.GetAsync("/admin/auth-audit-logs?take=10");
        Assert.Equal(HttpStatusCode.OK, adminResponse.StatusCode);

        var rows = await adminResponse.Content.ReadFromJsonAsync<List<AuthAuditLogResponse>>();
        Assert.NotNull(rows);
        Assert.NotEmpty(rows!);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken("2", "user"));
        var userResponse = await client.GetAsync("/admin/auth-audit-logs?take=10");
        Assert.Equal(HttpStatusCode.Forbidden, userResponse.StatusCode);
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

    public sealed record RegisterRequest(string Email, string Password);
    public sealed record LoginRequest(string Email, string Password);
    public sealed record RefreshRequest(string RefreshToken);
    public sealed record RevokeRequest(string RefreshToken);
    public sealed record AuthTokensResponse(string AccessToken, string RefreshToken);
    public sealed record AuthAuditLogResponse(Guid Id, Guid? UserId, string Action, bool Success, string? Detail, DateTime CreatedAtUtc);
}

public class IdentityApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("IdentityDb:UseInMemory", "true");
    }
}
