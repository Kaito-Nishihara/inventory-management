using Catalog.Api.Application.Categories;
using Catalog.Api.Application.Inventory;
using Catalog.Api.Application.Products;
using Catalog.Api.Grpc;
using Catalog.Api.Infrastructure;
using Catalog.Api.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options =>
{
    // REST endpoints (controllers + health)
    options.ListenAnyIP(8080, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http1;
    });

    // gRPC endpoint (h2c)
    options.ListenAnyIP(8081, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http2;
    });
});

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod());
});
builder.Services.AddOpenApi();
builder.Services.AddGrpc();
var useInMemoryCatalogDb = builder.Configuration.GetValue<bool>("CatalogDb:UseInMemory");
var bulkProductCount = builder.Configuration.GetValue<int>("CatalogSeed:BulkProductCount");
if (useInMemoryCatalogDb)
{
    builder.Services.AddDbContext<CatalogDbContext>(options =>
        options.UseInMemoryDatabase("catalog-tests"));
}
else
{
    builder.Services.AddDbContext<CatalogDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("CatalogDb")));
}
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IInventoryRepository, InventoryRepository>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSettings.SecretKey)),
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
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

    await CatalogSeed.SeedDefaultsAsync(db, bulkProductCount);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok("Healthy"))
    .WithName("Health");

app.MapControllers();
app.MapGrpcService<InventoryGrpcService>();

app.Run();

public static class JwtSettings
{
    public const string SecretKey = "super_secret_development_key_12345";
}

public partial class Program;
