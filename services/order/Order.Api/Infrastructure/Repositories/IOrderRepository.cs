using Order.Api.Domain;

namespace Order.Api.Infrastructure.Repositories;

/// <summary>
/// 注文集約の永続化を担います。
/// </summary>
public interface IOrderRepository
{
    /// <summary>
    /// 注文を追加します。
    /// </summary>
    /// <param name="order">保存対象の注文です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    Task AddAsync(Order.Api.Domain.Order order, CancellationToken cancellationToken = default);

    /// <summary>
    /// 注文IDで取得します。
    /// </summary>
    /// <param name="orderId">注文IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文です。未存在時はnullです。</returns>
    Task<Order.Api.Domain.Order?> GetByIdAsync(Guid orderId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ユーザーの注文一覧を取得します。
    /// </summary>
    /// <param name="userId">ユーザーIDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文一覧です。</returns>
    Task<IReadOnlyList<Order.Api.Domain.Order>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// 全注文を取得します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文一覧です。</returns>
    Task<IReadOnlyList<Order.Api.Domain.Order>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 変更を保存します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
