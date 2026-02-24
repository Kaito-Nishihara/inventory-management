using Order.Api.Domain;
using Order.Api.Infrastructure.Clients;
using Order.Api.Infrastructure.Repositories;

namespace Order.Api.Application.Orders;

public class OrderService(IOrderRepository orderRepository, IInventoryReservationGateway inventoryGateway) : IOrderService
{
    private readonly IOrderRepository _orderRepository = orderRepository;
    private readonly IInventoryReservationGateway _inventoryGateway = inventoryGateway;

    public async Task<CreateOrderResult> CreateAsync(CreateOrderCommand command, CancellationToken cancellationToken = default)
    {
        if (command.Quantity <= 0)
        {
            return new CreateOrderResult(CreateOrderStatus.InvalidQuantity);
        }

        var reserve = await _inventoryGateway.ReserveAsync(command.ProductId, command.Quantity, cancellationToken);
        if (!reserve.Success)
        {
            return new CreateOrderResult(CreateOrderStatus.InventoryUnavailable);
        }

        var order = Order.Api.Domain.Order.Create(command.UserId, command.ProductId, command.Quantity);
        await _orderRepository.AddAsync(order, cancellationToken);
        return new CreateOrderResult(CreateOrderStatus.Created, order.Id);
    }

    public async Task<OrderQueryResult?> GetByIdAsync(Guid orderId, string? userId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(orderId, cancellationToken);
        if (order is null)
        {
            return null;
        }

        if (!isAdmin && userId != order.UserId)
        {
            return null;
        }

        return Map(order);
    }

    public async Task<IReadOnlyList<OrderQueryResult>> GetListAsync(string? userId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var orders = isAdmin
            ? await _orderRepository.GetAllAsync(cancellationToken)
            : await _orderRepository.GetByUserIdAsync(userId ?? string.Empty, cancellationToken);

        return orders.Select(Map).ToList();
    }

    public async Task<ChangeOrderStatusResult> ChangeStatusAsync(ChangeOrderStatusCommand command, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(command.OrderId, cancellationToken);
        if (order is null)
        {
            return ChangeOrderStatusResult.NotFound;
        }

        if (!order.TryChangeStatus(command.NextStatus))
        {
            return ChangeOrderStatusResult.InvalidTransition;
        }

        await _orderRepository.SaveChangesAsync(cancellationToken);
        return ChangeOrderStatusResult.Success;
    }

    private static OrderQueryResult Map(Order.Api.Domain.Order x)
    {
        return new OrderQueryResult(
            x.Id,
            x.UserId,
            x.Status,
            x.CreatedAtUtc,
            x.UpdatedAtUtc,
            x.Items.Select(i => new OrderItemResult(i.ProductId, i.Quantity)).ToList());
    }
}
