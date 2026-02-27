using Catalog.Api.Domain;

namespace Catalog.Api.Infrastructure.Repositories;

public interface ICategoryRepository
{
    /// <summary>
    /// 有効なカテゴリ一覧を取得します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>カテゴリ一覧です。</returns>
    Task<IReadOnlyList<Category>> GetActiveListAsync(CancellationToken cancellationToken = default);
}
