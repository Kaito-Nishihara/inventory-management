namespace Catalog.Api.Domain;

public class Product
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public bool IsPublished { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime UpdatedAtUtc { get; private set; }

    public InventoryItem? Inventory { get; private set; }

    public static Product Create(string name, string description, decimal price)
    {
        var now = DateTime.UtcNow;
        return new Product
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Description = description.Trim(),
            Price = price,
            IsPublished = false,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public void Update(string name, string description, decimal price)
    {
        Name = name.Trim();
        Description = description.Trim();
        Price = price;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void SetPublished(bool isPublished)
    {
        IsPublished = isPublished;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
