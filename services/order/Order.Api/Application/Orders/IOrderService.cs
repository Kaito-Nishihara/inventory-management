namespace Order.Api.Application.Orders;

public interface IOrderService
{
    Task<CreateOrderResult> CreateAsync(CreateOrderCommand command, CancellationToken cancellationToken = default);
    Task<OrderQueryResult?> GetByIdAsync(Guid orderId, string? userId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OrderQueryResult>> GetListAsync(string? userId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<ChangeOrderStatusResult> ChangeStatusAsync(ChangeOrderStatusCommand command, CancellationToken cancellationToken = default);
}
