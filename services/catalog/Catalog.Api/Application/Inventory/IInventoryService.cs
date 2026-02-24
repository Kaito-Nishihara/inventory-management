namespace Catalog.Api.Application.Inventory;

public interface IInventoryService
{
    /// <summary>
    /// 入庫を実行します。
    /// </summary>
    /// <param name="command">入庫情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    Task<InventoryUpdateResult> ReceiveAsync(ReceiveInventoryCommand command, CancellationToken cancellationToken = default);

    /// <summary>
    /// 出庫を実行します。
    /// </summary>
    /// <param name="command">出庫情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    Task<InventoryUpdateResult> IssueAsync(IssueInventoryCommand command, CancellationToken cancellationToken = default);

    /// <summary>
    /// 棚卸調整を実行します。
    /// </summary>
    /// <param name="command">棚卸情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    Task<InventoryUpdateResult> AdjustAsync(AdjustInventoryCommand command, CancellationToken cancellationToken = default);

    /// <summary>
    /// 注文向け在庫引当を実行します。
    /// </summary>
    /// <param name="command">引当情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    Task<InventoryUpdateResult> ReserveAsync(ReserveInventoryCommand command, CancellationToken cancellationToken = default);
}
