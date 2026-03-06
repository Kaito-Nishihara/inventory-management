namespace Catalog.Api.Domain;

public class StockLocation
{
    public Guid Id { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Type { get; private set; } = string.Empty;
    public bool IsActive { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    public static StockLocation Create(string code, string name, string type)
    {
        return new StockLocation
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = name,
            Type = type,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
