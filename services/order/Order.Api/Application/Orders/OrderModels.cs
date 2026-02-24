namespace Order.Api.Application.Orders;

public sealed record CreateOrderCommand(string UserId, Guid ProductId, int Quantity);
public sealed record ChangeOrderStatusCommand(Guid OrderId, string NextStatus);
public sealed record OrderQueryResult(Guid Id, string UserId, string Status, DateTime CreatedAtUtc, DateTime UpdatedAtUtc, IReadOnlyList<OrderItemResult> Items);
public sealed record OrderItemResult(Guid ProductId, int Quantity);

public enum CreateOrderStatus
{
    Created,
    InventoryUnavailable,
    InvalidQuantity
}

public sealed record CreateOrderResult(CreateOrderStatus Status, Guid? OrderId = null);

public enum ChangeOrderStatusResult
{
    Success,
    NotFound,
    InvalidTransition
}
