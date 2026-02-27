namespace Catalog.Api.Application.Categories;

public sealed record CategoryQueryResult(Guid Id, string Key, string Name, int SortOrder);
