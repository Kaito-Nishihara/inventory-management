namespace Catalog.Api.Domain;

public class Category
{
    public Guid Id { get; private set; }
    public string Key { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public int SortOrder { get; private set; }
    public bool IsActive { get; private set; }

    public ICollection<Product> Products { get; private set; } = new List<Product>();

    public static Category Create(string key, string name, int sortOrder)
    {
        return new Category
        {
            Id = Guid.NewGuid(),
            Key = key.Trim(),
            Name = name.Trim(),
            SortOrder = sortOrder,
            IsActive = true,
        };
    }

    public void Update(string name, int sortOrder, bool isActive)
    {
        Name = name.Trim();
        SortOrder = sortOrder;
        IsActive = isActive;
    }
}
