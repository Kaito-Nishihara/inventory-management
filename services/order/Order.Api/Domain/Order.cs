namespace Order.Api.Domain;

public class Order
{
    public Guid Id { get; private set; }
    public string UserId { get; private set; } = string.Empty;
    public string Status { get; private set; } = OrderStatuses.Accepted;
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime UpdatedAtUtc { get; private set; }

    public List<OrderItem> Items { get; private set; } = new();
    public List<OrderStatusHistory> StatusHistory { get; private set; } = new();

    public static Order Create(string userId, Guid productId, int quantity)
    {
        var now = DateTime.UtcNow;
        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Status = OrderStatuses.Accepted,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        order.Items.Add(OrderItem.Create(order.Id, productId, quantity));
        order.StatusHistory.Add(OrderStatusHistory.Create(order.Id, OrderStatuses.Accepted, "order_created"));
        return order;
    }

    public bool TryChangeStatus(string nextStatus)
    {
        if (!IsValidTransition(Status, nextStatus))
        {
            return false;
        }

        Status = nextStatus;
        UpdatedAtUtc = DateTime.UtcNow;
        StatusHistory.Add(OrderStatusHistory.Create(Id, nextStatus, "status_changed"));
        return true;
    }

    private static bool IsValidTransition(string current, string next)
    {
        return (current, next) switch
        {
            (OrderStatuses.Accepted, OrderStatuses.Shipped) => true,
            (OrderStatuses.Accepted, OrderStatuses.Cancelled) => true,
            (OrderStatuses.Shipped, OrderStatuses.Completed) => true,
            _ => false
        };
    }
}
