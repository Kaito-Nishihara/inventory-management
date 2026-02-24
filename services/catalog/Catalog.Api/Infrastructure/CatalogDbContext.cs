using Catalog.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Infrastructure;

public class CatalogDbContext(DbContextOptions<CatalogDbContext> options) : DbContext(options)
{
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

    /// <summary>
    /// モデル定義を構成します。
    /// </summary>
    /// <param name="modelBuilder">モデルビルダーです。</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("catalog");

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000).IsRequired();
            entity.Property(x => x.Price).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.IsPublished).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();
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
    }
}
