using Identity.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Identity.Api.Infrastructure;

public class IdentityDbContext(DbContextOptions<IdentityDbContext> options) : DbContext(options)
{
    /// <summary>
    /// ユーザー集合です。
    /// </summary>
    public DbSet<User> Users => Set<User>();

    /// <summary>
    /// モデル定義を構成します。
    /// </summary>
    /// <param name="modelBuilder">モデルビルダーです。</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("identity");

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Email).HasMaxLength(256).IsRequired();
            entity.Property(x => x.PasswordHash).IsRequired();
            entity.Property(x => x.Role).HasMaxLength(32).IsRequired();
            entity.HasIndex(x => x.Email).IsUnique();
        });
    }
}
