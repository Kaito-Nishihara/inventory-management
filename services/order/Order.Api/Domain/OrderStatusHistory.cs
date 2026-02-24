namespace Order.Api.Domain;

public class OrderStatusHistory
{
    public Guid Id { get; private set; }
    public Guid OrderId { get; private set; }
    public string Status { get; private set; } = string.Empty;
    public string Note { get; private set; } = string.Empty;
    public DateTime CreatedAtUtc { get; private set; }

    public static OrderStatusHistory Create(Guid orderId, string status, string note)
    {
        return new OrderStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Status = status,
            Note = note,
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
