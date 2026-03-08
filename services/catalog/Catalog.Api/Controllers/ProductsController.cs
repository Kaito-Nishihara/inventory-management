using Catalog.Api.Application.Products;
using Backend.Validation;
using Microsoft.AspNetCore.Mvc;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("products")]
public class ProductsController(IProductService productService) : ControllerBase
{
    private readonly IProductService _productService = productService;

    /// <summary>
    /// 公開商品一覧をページングで返します。
    /// </summary>
    /// <param name="q">検索キーワードです。</param>
    /// <param name="categoryId">カテゴリIDです。</param>
    /// <param name="sort">ソート条件です。</param>
    /// <param name="page">ページ番号です。</param>
    /// <param name="pageSize">ページサイズです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>公開商品一覧ページです。</returns>
    [HttpGet]
    [ProducesResponseType(typeof(ProductListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ProductListResponse>> GetProducts(
        [FromQuery] string? q,
        [FromQuery] Guid? categoryId,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _productService.GetPublishedListAsync(
            new ProductListQuery(q, categoryId, sort, page, pageSize),
            cancellationToken);

        var totalPages = result.TotalCount == 0
            ? 0
            : (int)Math.Ceiling((double)result.TotalCount / result.PageSize);

        return Ok(new ProductListResponse(
            result.Items.Select(Map).ToList(),
            result.TotalCount,
            result.Page,
            result.PageSize,
            totalPages));
    }

    /// <summary>
    /// 公開商品の詳細を返します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>商品詳細です。</returns>
    [HttpGet("{productId:guid}")]
    [ProducesResponseType(typeof(ProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductResponse>> GetProduct(Guid productId, CancellationToken cancellationToken)
    {
        var product = await _productService.GetPublishedByIdAsync(productId, cancellationToken);
        if (product is null)
        {
            return this.ToProblem(StatusCodes.Status404NotFound, ApiErrorCodes.ProductNotFound);
        }

        return Ok(Map(product));
    }

    /// <summary>
    /// アプリケーションモデルをAPIレスポンスへ変換します。
    /// </summary>
    /// <param name="x">商品情報です。</param>
    /// <returns>APIレスポンスです。</returns>
    private static ProductResponse Map(ProductQueryResult x)
    {
        return new ProductResponse(
            x.Id,
            x.CategoryId,
            x.CategoryKey,
            x.CategoryName,
            x.Name,
            x.Description,
            x.Price,
            x.OnHand,
            x.Reserved,
            x.Available,
            x.Version);
    }
}

public sealed record ProductResponse(
    Guid Id,
    Guid CategoryId,
    string CategoryKey,
    string CategoryName,
    string Name,
    string Description,
    decimal Price,
    int OnHand,
    int Reserved,
    int Available,
    int Version);

public sealed record ProductListResponse(
    IReadOnlyList<ProductResponse> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages);
