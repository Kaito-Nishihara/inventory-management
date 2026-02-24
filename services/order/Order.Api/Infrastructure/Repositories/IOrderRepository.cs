using Order.Api.Domain;

namespace Order.Api.Infrastructure.Repositories;

public interface IOrderRepository
{
    Task AddAsync(Order.Api.Domain.Order order, CancellationToken cancellationToken = default);
    Task<Order.Api.Domain.Order?> GetByIdAsync(Guid orderId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Order.Api.Domain.Order>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Order.Api.Domain.Order>> GetAllAsync(CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
