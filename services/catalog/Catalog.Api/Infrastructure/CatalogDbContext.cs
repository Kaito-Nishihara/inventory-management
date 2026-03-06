using Catalog.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Infrastructure;

public class CatalogDbContext(DbContextOptions<CatalogDbContext> options) : DbContext(options)
{
    /// <summary>
    /// カテゴリ集合です。
    /// </summary>
    public DbSet<Category> Categories => Set<Category>();

    /// <summary>
    /// 商品集合です。
    /// </summary>
    public DbSet<Product> Products => Set<Product>();

    /// <summary>
    /// 在庫集合です。
    /// </summary>
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();

    /// <summary>
    /// 在庫履歴集合です。
    /// </summary>
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<StockLocation> StockLocations => Set<StockLocation>();
    public DbSet<LocationInventoryItem> LocationInventoryItems => Set<LocationInventoryItem>();
    public DbSet<LocationInventoryTransfer> LocationInventoryTransfers => Set<LocationInventoryTransfer>();

    /// <summary>
    /// モデル定義を構成します。
    /// </summary>
    /// <param name="modelBuilder">モデルビルダーです。</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("catalog");

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Key).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(100).IsRequired();
            entity.Property(x => x.SortOrder).IsRequired();
            entity.Property(x => x.IsActive).IsRequired();
            entity.HasIndex(x => x.Key).IsUnique();
            entity.HasIndex(x => new { x.IsActive, x.SortOrder });
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CategoryId).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000).IsRequired();
            entity.Property(x => x.Price).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.IsPublished).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();
            entity.HasIndex(x => x.CategoryId);
            entity.HasOne(x => x.Category)
                .WithMany(x => x.Products)
                .HasForeignKey(x => x.CategoryId);
        });

        modelBuilder.Entity<InventoryItem>(entity =>
        {
            entity.ToTable("inventory_items");
            entity.HasKey(x => x.ProductId);
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();
            entity.HasOne(x => x.Product)
                .WithOne(x => x.Inventory)
                .HasForeignKey<InventoryItem>(x => x.ProductId);
        });

        modelBuilder.Entity<InventoryTransaction>(entity =>
        {
            entity.ToTable("inventory_transactions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Type).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Note).HasMaxLength(512);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.HasIndex(x => x.ProductId);
            entity.HasIndex(x => x.CreatedAtUtc);
        });

        modelBuilder.Entity<StockLocation>(entity =>
        {
            entity.ToTable("stock_locations");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Code).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Type).HasMaxLength(50).IsRequired();
            entity.Property(x => x.IsActive).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<LocationInventoryItem>(entity =>
        {
            entity.ToTable("location_inventory_items");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();
            entity.HasIndex(x => new { x.ProductId, x.LocationId }).IsUnique();
            entity.HasIndex(x => x.LocationId);
            entity.HasIndex(x => x.ProductId);
        });

        modelBuilder.Entity<LocationInventoryTransfer>(entity =>
        {
            entity.ToTable("location_inventory_transfers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Note).HasMaxLength(512);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.ShippedAtUtc);
            entity.Property(x => x.ReceivedAtUtc);
            entity.HasIndex(x => x.ProductId);
            entity.HasIndex(x => x.FromLocationId);
            entity.HasIndex(x => x.ToLocationId);
            entity.HasIndex(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.Status);
        });
    }
}
