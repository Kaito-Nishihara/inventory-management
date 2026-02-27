namespace Catalog.Api.Application.Products;

public interface IProductService
{
    /// <summary>
    /// 商品を作成します。
    /// </summary>
    /// <param name="command">作成情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>作成した商品IDです。</returns>
    Task<Guid> CreateAsync(CreateProductCommand command, CancellationToken cancellationToken = default);

    /// <summary>
    /// 商品を更新します。
    /// </summary>
    /// <param name="command">更新情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新できた場合はtrueです。</returns>
    Task<bool> UpdateAsync(UpdateProductCommand command, CancellationToken cancellationToken = default);

    /// <summary>
    /// 公開状態を更新します。
    /// </summary>
    /// <param name="command">公開設定です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新できた場合はtrueです。</returns>
    Task<bool> PublishAsync(PublishProductCommand command, CancellationToken cancellationToken = default);

    /// <summary>
    /// 公開商品一覧を取得します。
    /// </summary>
    /// <param name="query">一覧クエリです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>ページングされた商品一覧です。</returns>
    Task<ProductListPageResult> GetPublishedListAsync(ProductListQuery query, CancellationToken cancellationToken = default);

    /// <summary>
    /// 公開商品の詳細を取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>商品詳細。未存在ならnullです。</returns>
    Task<ProductQueryResult?> GetPublishedByIdAsync(Guid productId, CancellationToken cancellationToken = default);
}
