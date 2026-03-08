using Catalog.Api.Domain;
using Catalog.Api.Application.Products;
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
    /// 公開商品の一覧を在庫・カテゴリ付きで検索取得します。
    /// </summary>
    /// <param name="query">検索クエリです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>公開商品一覧と総件数です。</returns>
    public async Task<(IReadOnlyList<(Product Product, InventoryItem Inventory, Category Category)> Items, int TotalCount)>
        SearchPublishedWithInventoryListAsync(ProductListQuery query, CancellationToken cancellationToken = default)
    {
        var composed = _db.Products
            .AsNoTracking()
            .Where(x => x.IsPublished)
            .Join(
                _db.InventoryItems.AsNoTracking(),
                p => p.Id,
                i => i.ProductId,
                (p, i) => new { Product = p, Inventory = i })
            .Join(
                _db.Categories.AsNoTracking().Where(c => c.IsActive),
                x => x.Product.CategoryId,
                c => c.Id,
                (x, c) => new { x.Product, x.Inventory, Category = c });

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            var keyword = query.Keyword.Trim();
            composed = composed.Where(x => x.Product.Name.Contains(keyword) || x.Product.Description.Contains(keyword));
        }

        if (query.CategoryId is not null)
        {
            composed = composed.Where(x => x.Product.CategoryId == query.CategoryId.Value);
        }

        composed = query.Sort switch
        {
            "price-asc" => composed.OrderBy(x => x.Product.Price),
            "price-desc" => composed.OrderByDescending(x => x.Product.Price),
            "stock-desc" => composed.OrderByDescending(x => x.Inventory.OnHand - x.Inventory.Reserved),
            "newest" => composed.OrderByDescending(x => x.Product.CreatedAtUtc),
            _ => composed.OrderBy(x => x.Product.Name)
        };

        var totalCount = await composed.CountAsync(cancellationToken);

        var pairs = await composed
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return (pairs.Select(x => (x.Product, x.Inventory, x.Category)).ToList(), totalCount);
    }

    /// <summary>
    /// 管理者向けに全商品の一覧を在庫・カテゴリ付きで検索取得します。
    /// </summary>
    /// <param name="query">検索クエリです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>全商品一覧と総件数です。</returns>
    public async Task<(IReadOnlyList<(Product Product, InventoryItem Inventory, Category Category)> Items, int TotalCount)>
        SearchAllWithInventoryListAsync(ProductListQuery query, CancellationToken cancellationToken = default)
    {
        var composed = _db.Products
            .AsNoTracking()
            .Join(
                _db.InventoryItems.AsNoTracking(),
                p => p.Id,
                i => i.ProductId,
                (p, i) => new { Product = p, Inventory = i })
            .Join(
                _db.Categories.AsNoTracking().Where(c => c.IsActive),
                x => x.Product.CategoryId,
                c => c.Id,
                (x, c) => new { x.Product, x.Inventory, Category = c });

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            var keyword = query.Keyword.Trim();
            composed = composed.Where(x => x.Product.Name.Contains(keyword) || x.Product.Description.Contains(keyword));
        }

        if (query.CategoryId is not null)
        {
            composed = composed.Where(x => x.Product.CategoryId == query.CategoryId.Value);
        }

        composed = query.Sort switch
        {
            "price-asc" => composed.OrderBy(x => x.Product.Price),
            "price-desc" => composed.OrderByDescending(x => x.Product.Price),
            "stock-desc" => composed.OrderByDescending(x => x.Inventory.OnHand - x.Inventory.Reserved),
            "newest" => composed.OrderByDescending(x => x.Product.CreatedAtUtc),
            _ => composed.OrderBy(x => x.Product.Name)
        };

        var totalCount = await composed.CountAsync(cancellationToken);
        var pairs = await composed
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return (pairs.Select(x => (x.Product, x.Inventory, x.Category)).ToList(), totalCount);
    }

    /// <summary>
    /// 公開商品を在庫付きで取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>公開商品。未存在ならnullです。</returns>
    public async Task<(Product Product, InventoryItem Inventory, Category Category)?> GetPublishedWithInventoryByIdAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        var pair = await _db.Products
            .AsNoTracking()
            .Where(x => x.IsPublished && x.Id == productId)
            .Join(
                _db.InventoryItems.AsNoTracking(),
                p => p.Id,
                i => i.ProductId,
                (p, i) => new { Product = p, Inventory = i })
            .Join(
                _db.Categories.AsNoTracking().Where(c => c.IsActive),
                x => x.Product.CategoryId,
                c => c.Id,
                (x, c) => new { x.Product, x.Inventory, Category = c })
            .SingleOrDefaultAsync(cancellationToken);

        return pair is null ? null : (pair.Product, pair.Inventory, pair.Category);
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
