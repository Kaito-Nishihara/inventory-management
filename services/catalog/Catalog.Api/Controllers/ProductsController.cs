using Catalog.Api.Application.Products;
using Microsoft.AspNetCore.Mvc;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("products")]
public class ProductsController(IProductService productService) : ControllerBase
{
    private readonly IProductService _productService = productService;

    /// <summary>
    /// 公開商品一覧を返します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>公開商品一覧です。</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProductResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProductResponse>>> GetProducts(CancellationToken cancellationToken)
    {
        var products = await _productService.GetPublishedListAsync(cancellationToken);
        return Ok(products.Select(Map).ToList());
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
            return NotFound();
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
    string Name,
    string Description,
    decimal Price,
    int OnHand,
    int Reserved,
    int Available,
    int Version);
