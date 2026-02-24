using Catalog.Api.Domain;

namespace Catalog.Api.Infrastructure.Repositories;

public interface IProductRepository
{
    /// <summary>
    /// 商品と在庫を新規保存します。
    /// </summary>
    /// <param name="product">商品です。</param>
    /// <param name="inventory">在庫です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    Task AddWithInventoryAsync(Product product, InventoryItem inventory, CancellationToken cancellationToken = default);

    /// <summary>
    /// IDで商品を取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>商品。未存在ならnullです。</returns>
    Task<Product?> GetByIdAsync(Guid productId, CancellationToken cancellationToken = default);

    /// <summary>
    /// 公開商品の一覧を在庫付きで取得します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>公開商品一覧です。</returns>
    Task<IReadOnlyList<(Product Product, InventoryItem Inventory)>> GetPublishedWithInventoryListAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 公開商品を在庫付きで取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>公開商品。未存在ならnullです。</returns>
    Task<(Product Product, InventoryItem Inventory)?> GetPublishedWithInventoryByIdAsync(Guid productId, CancellationToken cancellationToken = default);

    /// <summary>
    /// 変更を保存します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
