namespace Catalog.Api.Domain;

public class LocationInventoryItem
{
    public Guid Id { get; private set; }
    public Guid ProductId { get; private set; }
    public Guid LocationId { get; private set; }
    public int OnHand { get; private set; }
    public int Version { get; private set; }
    public DateTime UpdatedAtUtc { get; private set; }

    public static LocationInventoryItem Create(Guid productId, Guid locationId, int onHand = 0)
    {
        return new LocationInventoryItem
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            LocationId = locationId,
            OnHand = onHand,
            Version = 0,
            UpdatedAtUtc = DateTime.UtcNow
        };
    }

    public bool TryIncrease(int quantity)
    {
        if (quantity <= 0) return false;
        OnHand += quantity;
        Version += 1;
        UpdatedAtUtc = DateTime.UtcNow;
        return true;
    }

    public bool TryDecrease(int quantity)
    {
        if (quantity <= 0) return false;
        if (OnHand < quantity) return false;
        OnHand -= quantity;
        Version += 1;
        UpdatedAtUtc = DateTime.UtcNow;
        return true;
    }
}
