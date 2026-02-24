using Microsoft.AspNetCore.Mvc.Testing;
using Npgsql;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace Identity.Api.Tests;

public class AuthControllerPostgresTests(PostgresIdentityApiFactory factory) : IClassFixture<PostgresIdentityApiFactory>
{
    private const string ConnectionString = "Host=localhost;Port=5432;Database=invdb;Username=inv;Password=invpass;Timeout=2";

    [Fact]
    public async Task Register_PersistsToIdentityUsers_AndLoginReturnsJwt()
    {
        if (!await CanConnectToPostgresAsync())
        {
            return;
        }

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        var email = $"pg_{Guid.NewGuid():N}@test.com";
        const string plainPassword = "P@ssw0rd123!";

        var register = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, plainPassword));
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);

        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(
            "select password_hash from identity.users where email = @email",
            conn);
        cmd.Parameters.AddWithValue("email", email);
        var hash = (string?)await cmd.ExecuteScalarAsync();

        Assert.False(string.IsNullOrWhiteSpace(hash));
        Assert.NotEqual(plainPassword, hash);

        var login = await client.PostAsJsonAsync("/auth/login", new LoginRequest(email, plainPassword));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);

        var payload = await login.Content.ReadFromJsonAsync<AuthTokensResponse>();
        Assert.NotNull(payload);
        Assert.False(string.IsNullOrWhiteSpace(payload!.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(payload!.RefreshToken));

        var refresh = await client.PostAsJsonAsync("/auth/refresh", new RefreshRequest(payload.RefreshToken));
        Assert.Equal(HttpStatusCode.OK, refresh.StatusCode);
    }

    private static async Task<bool> CanConnectToPostgresAsync()
    {
        try
        {
            await using var conn = new NpgsqlConnection(ConnectionString);
            await conn.OpenAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }

    public sealed record RegisterRequest(string Email, string Password);
    public sealed record LoginRequest(string Email, string Password);
    public sealed record RefreshRequest(string RefreshToken);
    public sealed record AuthTokensResponse(string AccessToken, string RefreshToken);
}

public class PostgresIdentityApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("IdentityDb:UseInMemory", "false");
        builder.UseSetting("ConnectionStrings:IdentityDb", "Host=localhost;Port=5432;Database=invdb;Username=inv;Password=invpass");
    }
}
