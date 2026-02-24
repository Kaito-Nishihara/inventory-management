namespace Catalog.Api.Application.Products;

public sealed record CreateProductCommand(string Name, string Description, decimal Price);
public sealed record UpdateProductCommand(Guid ProductId, string Name, string Description, decimal Price);
public sealed record PublishProductCommand(Guid ProductId, bool IsPublished);
public sealed record ProductQueryResult(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    bool IsPublished,
    int OnHand,
    int Reserved,
    int Available,
    int Version);
