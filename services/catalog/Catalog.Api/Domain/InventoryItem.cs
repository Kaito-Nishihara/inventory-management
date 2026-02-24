namespace Catalog.Api.Domain;

public class InventoryItem
{
    public Guid ProductId { get; private set; }
    public int OnHand { get; private set; }
    public int Reserved { get; private set; }
    public int Version { get; private set; }
    public DateTime UpdatedAtUtc { get; private set; }

    public Product Product { get; private set; } = default!;

    public int Available => OnHand - Reserved;

    public static InventoryItem Create(Guid productId)
    {
        return new InventoryItem
        {
            ProductId = productId,
            OnHand = 0,
            Reserved = 0,
            Version = 0,
            UpdatedAtUtc = DateTime.UtcNow
        };
    }

    public bool TryReceive(int quantity)
    {
        if (quantity <= 0)
        {
            return false;
        }

        OnHand += quantity;
        Version++;
        UpdatedAtUtc = DateTime.UtcNow;
        return true;
    }

    public bool TryIssue(int quantity)
    {
        if (quantity <= 0 || Available < quantity)
        {
            return false;
        }

        OnHand -= quantity;
        Version++;
        UpdatedAtUtc = DateTime.UtcNow;
        return true;
    }

    public bool TryAdjust(int newOnHand)
    {
        if (newOnHand < Reserved)
        {
            return false;
        }

        OnHand = newOnHand;
        Version++;
        UpdatedAtUtc = DateTime.UtcNow;
        return true;
    }
}
