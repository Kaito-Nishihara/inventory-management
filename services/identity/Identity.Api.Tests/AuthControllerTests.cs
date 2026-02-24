using Identity.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
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

    public sealed record RegisterRequest(string Email, string Password);
    public sealed record LoginRequest(string Email, string Password);
    public sealed record RefreshRequest(string RefreshToken);
    public sealed record RevokeRequest(string RefreshToken);
    public sealed record AuthTokensResponse(string AccessToken, string RefreshToken);
}

public class IdentityApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("IdentityDb:UseInMemory", "true");
    }
}
