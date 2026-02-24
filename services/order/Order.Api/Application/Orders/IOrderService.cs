namespace Order.Api.Application.Orders;

/// <summary>
/// 注文ユースケースを提供します。
/// </summary>
public interface IOrderService
{
    /// <summary>
    /// 注文を作成します。
    /// </summary>
    /// <param name="command">注文作成コマンドです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>作成結果です。</returns>
    Task<CreateOrderResult> CreateAsync(CreateOrderCommand command, CancellationToken cancellationToken = default);

    /// <summary>
    /// 注文詳細を取得します。
    /// </summary>
    /// <param name="orderId">注文IDです。</param>
    /// <param name="userId">呼び出しユーザーIDです。</param>
    /// <param name="isAdmin">管理者かどうかです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文詳細です。閲覧不可または未存在時はnullです。</returns>
    Task<OrderQueryResult?> GetByIdAsync(Guid orderId, string? userId, bool isAdmin, CancellationToken cancellationToken = default);

    /// <summary>
    /// 注文一覧を取得します。
    /// </summary>
    /// <param name="userId">呼び出しユーザーIDです。</param>
    /// <param name="isAdmin">管理者かどうかです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文一覧です。</returns>
    Task<IReadOnlyList<OrderQueryResult>> GetListAsync(string? userId, bool isAdmin, CancellationToken cancellationToken = default);

    /// <summary>
    /// 注文ステータスを変更します。
    /// </summary>
    /// <param name="command">ステータス変更コマンドです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>変更結果です。</returns>
    Task<ChangeOrderStatusResult> ChangeStatusAsync(ChangeOrderStatusCommand command, CancellationToken cancellationToken = default);
}
