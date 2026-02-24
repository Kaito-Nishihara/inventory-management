using Inventory.Contracts;

namespace Order.Api.Infrastructure.Clients;

public class CatalogInventoryGrpcGateway(InventoryGrpc.InventoryGrpcClient client) : IInventoryReservationGateway
{
    private readonly InventoryGrpc.InventoryGrpcClient _client = client;

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
