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

    /// <summary>
    /// 注文キャンセル向け在庫返却を実行します。
    /// </summary>
    /// <param name="command">返却情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    Task<InventoryUpdateResult> ReleaseAsync(ReleaseInventoryCommand command, CancellationToken cancellationToken = default);

    /// <summary>
    /// 商品単位の在庫トランザクション履歴を取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="take">取得件数です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>在庫履歴です。</returns>
    Task<IReadOnlyList<InventoryTransactionResult>> GetTransactionsAsync(
        Guid productId,
        int take = 20,
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// ロケーション一覧を取得します。
    /// </summary>
    Task<IReadOnlyList<StockLocationResult>> GetLocationsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 商品単位のロケーション在庫を取得します。
    /// </summary>
    Task<IReadOnlyList<LocationInventoryStockResult>> GetLocationStocksAsync(Guid productId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ロケーション間在庫移動を実行します。
    /// </summary>
    Task<TransferLocationInventoryResult> CreateLocationTransferAsync(
        CreateLocationTransferCommand command,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 移動指示を出荷済みに更新します。
    /// </summary>
    Task<TransferLocationInventoryResult> ShipLocationTransferAsync(
        LocationTransferActionCommand command,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 出荷済みの移動を入荷済みに更新します。
    /// </summary>
    Task<TransferLocationInventoryResult> ReceiveLocationTransferAsync(
        LocationTransferActionCommand command,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 移動指示を取消します。
    /// </summary>
    Task<TransferLocationInventoryResult> CancelLocationTransferAsync(
        LocationTransferActionCommand command,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 商品単位のロケーション移動履歴を取得します。
    /// </summary>
    Task<IReadOnlyList<LocationInventoryTransferResult>> GetLocationTransfersAsync(
        Guid productId,
        int take = 20,
        CancellationToken cancellationToken = default);
}
