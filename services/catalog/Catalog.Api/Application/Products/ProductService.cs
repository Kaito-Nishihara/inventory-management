using Catalog.Api.Domain;
using Catalog.Api.Infrastructure.Repositories;

namespace Catalog.Api.Application.Products;

public class ProductService(IProductRepository productRepository) : IProductService
{
    private readonly IProductRepository _productRepository = productRepository;

    /// <summary>
    /// 商品を新規作成します。
    /// </summary>
    /// <param name="command">作成情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>作成した商品IDです。</returns>
    public async Task<Guid> CreateAsync(CreateProductCommand command, CancellationToken cancellationToken = default)
    {
        var product = Product.Create(command.CategoryId, command.Name, command.Description, command.Price);
        var inventory = InventoryItem.Create(product.Id);
        await _productRepository.AddWithInventoryAsync(product, inventory, cancellationToken);
        return product.Id;
    }

    /// <summary>
    /// 商品を更新します。
    /// </summary>
    /// <param name="command">更新情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新できた場合はtrueです。</returns>
    public async Task<bool> UpdateAsync(UpdateProductCommand command, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(command.ProductId, cancellationToken);
        if (product is null)
        {
            return false;
        }

        product.Update(command.CategoryId, command.Name, command.Description, command.Price);
        await _productRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    /// <summary>
    /// 商品の公開状態を変更します。
    /// </summary>
    /// <param name="command">公開設定です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新できた場合はtrueです。</returns>
    public async Task<bool> PublishAsync(PublishProductCommand command, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(command.ProductId, cancellationToken);
        if (product is null)
        {
            return false;
        }

        product.SetPublished(command.IsPublished);
        await _productRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    /// <summary>
    /// 公開商品一覧をページングで取得します。
    /// </summary>
    /// <param name="query">一覧クエリです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>商品一覧ページです。</returns>
    public async Task<ProductListPageResult> GetPublishedListAsync(ProductListQuery query, CancellationToken cancellationToken = default)
    {
        var safePage = Math.Max(1, query.Page);
        var safePageSize = Math.Clamp(query.PageSize, 1, 100);
        var safeQuery = query with { Page = safePage, PageSize = safePageSize };

        var (pairs, totalCount) = await _productRepository.SearchPublishedWithInventoryListAsync(safeQuery, cancellationToken);
        var items = pairs.Select(x => new ProductQueryResult(
            x.Product.Id,
            x.Product.CategoryId,
            x.Category.Key,
            x.Category.Name,
            x.Product.Name,
            x.Product.Description,
            x.Product.Price,
            x.Product.IsPublished,
            x.Inventory.OnHand,
            x.Inventory.Reserved,
            x.Inventory.Available,
            x.Inventory.Version)).ToList();

        return new ProductListPageResult(items, totalCount, safePage, safePageSize);
    }

    /// <summary>
    /// 管理者向けに公開/非公開を含む商品一覧をページングで取得します。
    /// </summary>
    /// <param name="query">一覧クエリです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>商品一覧ページです。</returns>
    public async Task<ProductListPageResult> GetAdminListAsync(ProductListQuery query, CancellationToken cancellationToken = default)
    {
        var safePage = Math.Max(1, query.Page);
        var safePageSize = Math.Clamp(query.PageSize, 1, 100);
        var safeQuery = query with { Page = safePage, PageSize = safePageSize };

        var (pairs, totalCount) = await _productRepository.SearchAllWithInventoryListAsync(safeQuery, cancellationToken);
        var items = pairs.Select(x => new ProductQueryResult(
            x.Product.Id,
            x.Product.CategoryId,
            x.Category.Key,
            x.Category.Name,
            x.Product.Name,
            x.Product.Description,
            x.Product.Price,
            x.Product.IsPublished,
            x.Inventory.OnHand,
            x.Inventory.Reserved,
            x.Inventory.Available,
            x.Inventory.Version)).ToList();

        return new ProductListPageResult(items, totalCount, safePage, safePageSize);
    }

    /// <summary>
    /// 公開商品の詳細を取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>商品詳細。未存在ならnullです。</returns>
    public async Task<ProductQueryResult?> GetPublishedByIdAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        var pair = await _productRepository.GetPublishedWithInventoryByIdAsync(productId, cancellationToken);
        if (pair is null)
        {
            return null;
        }

        return new ProductQueryResult(
            pair.Value.Product.Id,
            pair.Value.Product.CategoryId,
            pair.Value.Category.Key,
            pair.Value.Category.Name,
            pair.Value.Product.Name,
            pair.Value.Product.Description,
            pair.Value.Product.Price,
            pair.Value.Product.IsPublished,
            pair.Value.Inventory.OnHand,
            pair.Value.Inventory.Reserved,
            pair.Value.Inventory.Available,
            pair.Value.Inventory.Version);
    }
}
