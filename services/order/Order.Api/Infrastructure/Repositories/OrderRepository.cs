using Microsoft.EntityFrameworkCore;

namespace Order.Api.Infrastructure.Repositories;

public class OrderRepository(OrderDbContext db) : IOrderRepository
{
    private readonly OrderDbContext _db = db;
    private IQueryable<Order.Api.Domain.Order> OrdersWithDetails =>
        _db.Orders
            .Include(x => x.Items)
            .Include(x => x.StatusHistory);

    public async Task AddAsync(Order.Api.Domain.Order order, CancellationToken cancellationToken = default)
    {
        _db.Orders.Add(order);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public Task<Order.Api.Domain.Order?> GetByIdAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        return OrdersWithDetails.SingleOrDefaultAsync(x => x.Id == orderId, cancellationToken);
    }

    public async Task<IReadOnlyList<Order.Api.Domain.Order>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await OrdersWithDetails
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Order.Api.Domain.Order>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await OrdersWithDetails
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
