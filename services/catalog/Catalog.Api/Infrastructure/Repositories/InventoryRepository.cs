using Catalog.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Infrastructure.Repositories;

public class InventoryRepository(CatalogDbContext db) : IInventoryRepository
{
    private readonly CatalogDbContext _db = db;

    /// <summary>
    /// 商品IDで在庫を取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>在庫。未存在ならnullです。</returns>
    public Task<InventoryItem?> GetByProductIdAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        return _db.InventoryItems.SingleOrDefaultAsync(x => x.ProductId == productId, cancellationToken);
    }

    /// <summary>
    /// 在庫履歴を追加します。
    /// </summary>
    /// <param name="transaction">在庫履歴です。</param>
    public void AddTransaction(InventoryTransaction transaction)
    {
        _db.InventoryTransactions.Add(transaction);
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
