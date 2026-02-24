using Catalog.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Infrastructure.Repositories;

public class ProductRepository(CatalogDbContext db) : IProductRepository
{
    private readonly CatalogDbContext _db = db;

    /// <summary>
    /// 商品と在庫を新規保存します。
    /// </summary>
    /// <param name="product">商品です。</param>
    /// <param name="inventory">在庫です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    public async Task AddWithInventoryAsync(Product product, InventoryItem inventory, CancellationToken cancellationToken = default)
    {
        _db.Products.Add(product);
        _db.InventoryItems.Add(inventory);
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// IDで商品を取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>商品。未存在ならnullです。</returns>
    public Task<Product?> GetByIdAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        return _db.Products.SingleOrDefaultAsync(x => x.Id == productId, cancellationToken);
    }

    /// <summary>
    /// 公開商品の一覧を在庫付きで取得します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>公開商品一覧です。</returns>
    public async Task<IReadOnlyList<(Product Product, InventoryItem Inventory)>> GetPublishedWithInventoryListAsync(CancellationToken cancellationToken = default)
    {
        var pairs = await _db.Products
            .AsNoTracking()
            .Where(x => x.IsPublished)
            .Join(
                _db.InventoryItems.AsNoTracking(),
                p => p.Id,
                i => i.ProductId,
                (p, i) => new { Product = p, Inventory = i })
            .OrderBy(x => x.Product.Name)
            .ToListAsync(cancellationToken);

        return pairs.Select(x => (x.Product, x.Inventory)).ToList();
    }

    /// <summary>
    /// 公開商品を在庫付きで取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>公開商品。未存在ならnullです。</returns>
    public async Task<(Product Product, InventoryItem Inventory)?> GetPublishedWithInventoryByIdAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        var pair = await _db.Products
            .AsNoTracking()
            .Where(x => x.IsPublished && x.Id == productId)
            .Join(
                _db.InventoryItems.AsNoTracking(),
                p => p.Id,
                i => i.ProductId,
                (p, i) => new { Product = p, Inventory = i })
            .SingleOrDefaultAsync(cancellationToken);

        return pair is null ? null : (pair.Product, pair.Inventory);
    }

    /// <summary>
    /// 変更を保存します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
