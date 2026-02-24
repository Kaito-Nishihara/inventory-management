using Microsoft.EntityFrameworkCore;

namespace Order.Api.Infrastructure.Repositories;

/// <summary>
/// 注文リポジトリの実装です。
/// </summary>
public class OrderRepository(OrderDbContext db) : IOrderRepository
{
    private readonly OrderDbContext _db = db;
    private IQueryable<Order.Api.Domain.Order> OrdersWithDetails =>
        _db.Orders
            .Include(x => x.Items)
            .Include(x => x.StatusHistory);

    /// <summary>
    /// 注文を追加します。
    /// </summary>
    /// <param name="order">保存対象の注文です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    public async Task AddAsync(Order.Api.Domain.Order order, CancellationToken cancellationToken = default)
    {
        _db.Orders.Add(order);
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// 注文IDで注文を取得します。
    /// </summary>
    /// <param name="orderId">注文IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文です。未存在時はnullです。</returns>
    public Task<Order.Api.Domain.Order?> GetByIdAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        return OrdersWithDetails.SingleOrDefaultAsync(x => x.Id == orderId, cancellationToken);
    }

    /// <summary>
    /// ユーザー単位で注文一覧を取得します。
    /// </summary>
    /// <param name="userId">ユーザーIDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文一覧です。</returns>
    public async Task<IReadOnlyList<Order.Api.Domain.Order>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await OrdersWithDetails
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// 全注文を取得します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文一覧です。</returns>
    public async Task<IReadOnlyList<Order.Api.Domain.Order>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await OrdersWithDetails
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// 変更を保存します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
