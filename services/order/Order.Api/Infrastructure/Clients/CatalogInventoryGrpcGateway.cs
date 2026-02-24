using Inventory.Contracts;

namespace Order.Api.Infrastructure.Clients;

/// <summary>
/// Catalog gRPC 経由で在庫引当を実行します。
/// </summary>
public class CatalogInventoryGrpcGateway(InventoryGrpc.InventoryGrpcClient client) : IInventoryReservationGateway
{
    private readonly InventoryGrpc.InventoryGrpcClient _client = client;

    /// <summary>
    /// 在庫引当を依頼します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="quantity">引当数量です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>引当結果です。</returns>
    public async Task<ReserveResult> ReserveAsync(Guid productId, int quantity, CancellationToken cancellationToken = default)
    {
        var response = await _client.ReserveAsync(new ReserveInventoryRequest
        {
            ProductId = productId.ToString(),
            Quantity = quantity
        }, cancellationToken: cancellationToken);

        return new ReserveResult(response.Success, response.ErrorCode);
    }
}
