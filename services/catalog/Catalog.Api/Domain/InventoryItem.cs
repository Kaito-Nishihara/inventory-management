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

    public bool TryReserve(int quantity)
    {
        if (quantity <= 0 || Available < quantity)
        {
            return false;
        }

        Reserved += quantity;
        Version++;
        UpdatedAtUtc = DateTime.UtcNow;
        return true;
    }

    /// <summary>
    /// 引当在庫を返却します。
    /// </summary>
    /// <param name="quantity">返却数量です。</param>
    /// <returns>返却できた場合はtrueです。</returns>
    public bool TryRelease(int quantity)
    {
        if (quantity <= 0 || Reserved < quantity)
        {
            return false;
        }

        Reserved -= quantity;
        Version++;
        UpdatedAtUtc = DateTime.UtcNow;
        return true;
    }
}
