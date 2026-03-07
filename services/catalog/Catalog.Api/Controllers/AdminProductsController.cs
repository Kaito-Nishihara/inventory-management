using Catalog.Api.Application.Products;
using Backend.Validation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("admin/products")]
[Authorize(Roles = "admin")]
public class AdminProductsController(IProductService productService) : ControllerBase
{
    private readonly IProductService _productService = productService;

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
