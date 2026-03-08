using Catalog.Api.Domain;

namespace Catalog.Api.Infrastructure.Repositories;

public interface IInventoryRepository
{
    /// <summary>
    /// 商品IDで在庫を取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>在庫。未存在ならnullです。</returns>
    Task<InventoryItem?> GetByProductIdAsync(Guid productId, CancellationToken cancellationToken = default);

    /// <summary>
    /// 在庫履歴を追加します。
    /// </summary>
    /// <param name="transaction">在庫履歴です。</param>
    void AddTransaction(InventoryTransaction transaction);

    /// <summary>
    /// 商品単位の在庫履歴を新しい順で取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="take">取得件数です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>在庫履歴です。</returns>
    Task<IReadOnlyList<InventoryTransaction>> GetTransactionsByProductIdAsync(
        Guid productId,
        int take = 20,
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 変更を保存します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
