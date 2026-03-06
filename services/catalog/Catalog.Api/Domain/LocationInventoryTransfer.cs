namespace Catalog.Api.Domain;

public class LocationInventoryTransfer
{
    public const string StatusRequested = "移動指示";
    public const string StatusShipped = "出荷済み";
    public const string StatusReceived = "入荷済み";
    public const string StatusCancelled = "取消";

    public Guid Id { get; private set; }
    public Guid ProductId { get; private set; }
    public Guid FromLocationId { get; private set; }
    public Guid ToLocationId { get; private set; }
    public int Quantity { get; private set; }
    public string Status { get; private set; } = StatusRequested;
    public string? Note { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime? ShippedAtUtc { get; private set; }
    public DateTime? ReceivedAtUtc { get; private set; }

    public static LocationInventoryTransfer Create(
        Guid transferId,
        Guid productId,
        Guid fromLocationId,
        Guid toLocationId,
        int quantity,
        string? note)
    {
        return new LocationInventoryTransfer
        {
            Id = transferId,
            ProductId = productId,
            FromLocationId = fromLocationId,
            ToLocationId = toLocationId,
            Quantity = quantity,
            Status = StatusRequested,
            Note = note,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public bool CanShip => Status == StatusRequested;
    public bool CanReceive => Status == StatusShipped;
    public bool CanCancel => Status == StatusRequested;

    public bool TryMarkShipped()
    {
        if (!CanShip)
        {
            return false;
        }

        Status = StatusShipped;
        ShippedAtUtc = DateTime.UtcNow;
        return true;
    }

    public bool TryMarkReceived()
    {
        if (!CanReceive)
        {
            return false;
        }

        Status = StatusReceived;
        ReceivedAtUtc = DateTime.UtcNow;
        return true;
    }

    public bool TryCancel()
    {
        if (!CanCancel)
        {
            return false;
        }

        Status = StatusCancelled;
        return true;
    }
}
