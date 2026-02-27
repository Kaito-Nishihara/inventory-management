using Catalog.Api.Infrastructure.Repositories;

namespace Catalog.Api.Application.Categories;

public class CategoryService(ICategoryRepository categoryRepository) : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository = categoryRepository;

    /// <summary>
    /// 有効なカテゴリ一覧を返します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>カテゴリ一覧です。</returns>
    public async Task<IReadOnlyList<CategoryQueryResult>> GetActiveListAsync(CancellationToken cancellationToken = default)
    {
        var categories = await _categoryRepository.GetActiveListAsync(cancellationToken);
        return categories
            .Select(x => new CategoryQueryResult(x.Id, x.Key, x.Name, x.SortOrder))
            .ToList();
    }
}
