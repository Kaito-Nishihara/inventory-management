using Catalog.Api.Application.Categories;
using Microsoft.AspNetCore.Mvc;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("categories")]
public class CategoriesController(ICategoryService categoryService) : ControllerBase
{
    private readonly ICategoryService _categoryService = categoryService;

    /// <summary>
    /// 有効なカテゴリ一覧を返します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>カテゴリ一覧です。</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CategoryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CategoryResponse>>> GetCategories(CancellationToken cancellationToken)
    {
        var categories = await _categoryService.GetActiveListAsync(cancellationToken);
        return Ok(categories.Select(x => new CategoryResponse(x.Id, x.Key, x.Name, x.SortOrder)).ToList());
    }
}

public sealed record CategoryResponse(Guid Id, string Key, string Name, int SortOrder);
