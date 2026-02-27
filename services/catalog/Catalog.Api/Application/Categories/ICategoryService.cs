namespace Catalog.Api.Application.Categories;

public interface ICategoryService
{
    /// <summary>
    /// 有効なカテゴリ一覧を返します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>カテゴリ一覧です。</returns>
    Task<IReadOnlyList<CategoryQueryResult>> GetActiveListAsync(CancellationToken cancellationToken = default);
}
