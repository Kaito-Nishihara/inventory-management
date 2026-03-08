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
    /// 商品単位の在庫履歴を新しい順で取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="take">取得件数です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>在庫履歴です。</returns>
    public async Task<IReadOnlyList<InventoryTransaction>> GetTransactionsByProductIdAsync(
        Guid productId,
        int take = 20,
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        CancellationToken cancellationToken = default)
    {
        var safeTake = Math.Clamp(take, 1, 100);
        var query = _db.InventoryTransactions
            .AsNoTracking()
            .Where(x => x.ProductId == productId);

        if (fromUtc.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc <= toUtc.Value);
        }

        return await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(safeTake)
            .ToListAsync(cancellationToken);
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
