using Identity.Api.Application.Auth;
using Identity.Api.Domain;
using Identity.Api.Infrastructure;
using Identity.Api.Infrastructure.Repositories;
using Identity.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod());
});
builder.Services.AddOpenApi();
var useInMemoryIdentityDb = builder.Configuration.GetValue<bool>("IdentityDb:UseInMemory");
if (useInMemoryIdentityDb)
{
    builder.Services.AddDbContext<IdentityDbContext>(options =>
        options.UseInMemoryDatabase("identity-tests"));
}
else
{
    builder.Services.AddDbContext<IdentityDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("IdentityDb")));
}
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IAuthAuditLogRepository, AuthAuditLogRepository>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSettings.SecretKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
    if (db.Database.IsRelational())
    {
        var hasMigrations = db.Database.GetMigrations().Any();
        if (hasMigrations)
        {
            await db.Database.MigrateAsync();
        }
        else
        {
            await db.Database.EnsureCreatedAsync();
        }
    }
    else
    {
        await db.Database.EnsureCreatedAsync();
    }

    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
    await IdentitySeed.SeedDefaultsAsync(db, passwordHasher);
}

var openApiEnabled = app.Configuration.GetValue<bool?>("OpenApi:Enabled") ?? true;
if (openApiEnabled)
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok("Healthy"))
    .WithName("Health");

app.MapControllers();

app.Run();

public static class JwtSettings
{
    public const string SecretKey = "super_secret_development_key_12345";
}

public partial class Program;
