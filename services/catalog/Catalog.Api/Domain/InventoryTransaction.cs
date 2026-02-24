namespace Catalog.Api.Domain;

public class InventoryTransaction
{
    public Guid Id { get; private set; }
    public Guid ProductId { get; private set; }
    public string Type { get; private set; } = string.Empty;
    public int QuantityDelta { get; private set; }
    public int OnHandAfter { get; private set; }
    public int ReservedAfter { get; private set; }
    public string? Note { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    public static InventoryTransaction Create(
        Guid productId,
        string type,
        int quantityDelta,
        int onHandAfter,
        int reservedAfter,
        string? note)
    {
        return new InventoryTransaction
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Type = type,
            QuantityDelta = quantityDelta,
            OnHandAfter = onHandAfter,
            ReservedAfter = reservedAfter,
            Note = note,
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
