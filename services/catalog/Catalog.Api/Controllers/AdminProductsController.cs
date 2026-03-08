using Catalog.Api.Application.Products;
using Backend.Validation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Catalog.Api.Security;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("admin/products")]
[Authorize(Policy = CatalogPolicies.CatalogAdmin)]
public class AdminProductsController(IProductService productService) : ControllerBase
{
    private readonly IProductService _productService = productService;

    /// <summary>
    /// 管理者向けに商品一覧を返します（公開/非公開を含む）。
    /// </summary>
    /// <param name="q">検索キーワードです。</param>
    /// <param name="categoryId">カテゴリIDです。</param>
    /// <param name="sort">ソート条件です。</param>
    /// <param name="page">ページ番号です。</param>
    /// <param name="pageSize">ページサイズです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>商品一覧ページです。</returns>
    [HttpGet]
    [ProducesResponseType(typeof(AdminProductListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminProductListResponse>> GetProducts(
        [FromQuery] string? q,
        [FromQuery] Guid? categoryId,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _productService.GetAdminListAsync(
            new ProductListQuery(q, categoryId, sort, page, pageSize),
            cancellationToken);

        var totalPages = result.TotalCount == 0
            ? 0
            : (int)Math.Ceiling((double)result.TotalCount / result.PageSize);

        return Ok(new AdminProductListResponse(
            result.Items.Select(Map).ToList(),
            result.TotalCount,
            result.Page,
            result.PageSize,
            totalPages));
    }

    /// <summary>
    /// 商品を新規作成します。
    /// </summary>
    /// <param name="request">商品作成リクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>作成結果です。</returns>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest request, CancellationToken cancellationToken)
    {
        var productId = await _productService.CreateAsync(
            new CreateProductCommand(request.CategoryId, request.Name, request.Description, request.Price),
            cancellationToken);

        return Created($"/admin/products/{productId}", new { productId });
    }

    /// <summary>
    /// 商品情報を更新します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="request">商品更新リクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    [HttpPut("{productId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProduct(Guid productId, [FromBody] UpdateProductRequest request, CancellationToken cancellationToken)
    {
        var updated = await _productService.UpdateAsync(
            new UpdateProductCommand(productId, request.CategoryId, request.Name, request.Description, request.Price),
            cancellationToken);

        if (!updated)
        {
            return NotFound();
        }

        return NoContent();
    }

    /// <summary>
    /// 商品の公開状態を変更します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="request">公開設定リクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    [HttpPost("{productId:guid}/publish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetPublish(Guid productId, [FromBody] PublishProductRequest request, CancellationToken cancellationToken)
    {
        var updated = await _productService.PublishAsync(
            new PublishProductCommand(productId, request.IsPublished),
            cancellationToken);

        if (!updated)
        {
            return NotFound();
        }

        return NoContent();
    }

    private static AdminProductResponse Map(ProductQueryResult x)
    {
        return new AdminProductResponse(
            x.Id,
            x.CategoryId,
            x.CategoryKey,
            x.CategoryName,
            x.Name,
            x.Description,
            x.Price,
            x.IsPublished,
            x.OnHand,
            x.Reserved,
            x.Available,
            x.Version);
    }
}

public sealed record CreateProductRequest(
    [NonEmptyGuid(ErrorMessage = ValidationCodes.NonEmptyGuid)] Guid CategoryId,
    [Required(ErrorMessage = ValidationCodes.Required), StringLength(200, MinimumLength = 1, ErrorMessage = ValidationCodes.StringLength)] string Name,
    [Required(ErrorMessage = ValidationCodes.Required), StringLength(2000, MinimumLength = 1, ErrorMessage = ValidationCodes.StringLength)] string Description,
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335", ErrorMessage = ValidationCodes.Range)] decimal Price);
public sealed record UpdateProductRequest(
    [NonEmptyGuid(ErrorMessage = ValidationCodes.NonEmptyGuid)] Guid CategoryId,
    [Required(ErrorMessage = ValidationCodes.Required), StringLength(200, MinimumLength = 1, ErrorMessage = ValidationCodes.StringLength)] string Name,
    [Required(ErrorMessage = ValidationCodes.Required), StringLength(2000, MinimumLength = 1, ErrorMessage = ValidationCodes.StringLength)] string Description,
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335", ErrorMessage = ValidationCodes.Range)] decimal Price);
public sealed record PublishProductRequest(bool IsPublished);
public sealed record AdminProductResponse(
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
public sealed record AdminProductListResponse(
    IReadOnlyList<AdminProductResponse> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages);
