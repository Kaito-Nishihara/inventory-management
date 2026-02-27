using Catalog.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Infrastructure.Repositories;

public class CategoryRepository(CatalogDbContext db) : ICategoryRepository
{
    private readonly CatalogDbContext _db = db;

    /// <summary>
    /// 有効なカテゴリ一覧を取得します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>カテゴリ一覧です。</returns>
    public async Task<IReadOnlyList<Category>> GetActiveListAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Categories
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }
}
