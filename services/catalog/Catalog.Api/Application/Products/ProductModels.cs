namespace Catalog.Api.Application.Products;

public sealed record CreateProductCommand(Guid CategoryId, string Name, string Description, decimal Price);
public sealed record UpdateProductCommand(Guid ProductId, Guid CategoryId, string Name, string Description, decimal Price);
public sealed record PublishProductCommand(Guid ProductId, bool IsPublished);
public sealed record ProductListQuery(
    string? Keyword,
    Guid? CategoryId,
    string? Sort,
    int Page,
    int PageSize);
public sealed record ProductListPageResult(
    IReadOnlyList<ProductQueryResult> Items,
    int TotalCount,
    int Page,
    int PageSize);
public sealed record ProductQueryResult(
    Guid Id,
    Guid CategoryId,
    string CategoryKey,
    string CategoryName,
    string Name,
    string Description,
    decimal Price,
    bool IsPublished,
    int OnHand,
    int Reserved,
    int Available,
    int Version);
