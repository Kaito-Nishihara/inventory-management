namespace Order.Api.Infrastructure.Clients;

/// <summary>
/// 在庫引当連携を抽象化します。
/// </summary>
public interface IInventoryReservationGateway
{
    /// <summary>
    /// 在庫引当を依頼します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="quantity">引当数量です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>引当結果です。</returns>
    Task<ReserveResult> ReserveAsync(Guid productId, int quantity, CancellationToken cancellationToken = default);
}

/// <summary>
/// 在庫引当結果です。
/// </summary>
/// <param name="Success">成功可否です。</param>
/// <param name="ErrorCode">失敗時のエラーコードです。</param>
public sealed record ReserveResult(bool Success, string ErrorCode);
