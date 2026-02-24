using Catalog.Api.Application.Inventory;
using Grpc.Core;
using Inventory.Contracts;

namespace Catalog.Api.Grpc;

/// <summary>
/// 在庫引当のgRPCエンドポイントを提供します。
/// </summary>
public class InventoryGrpcService(IInventoryService inventoryService) : InventoryGrpc.InventoryGrpcBase
{
    private readonly IInventoryService _inventoryService = inventoryService;

    /// <summary>
    /// 注文向けに在庫引当を実行します。
    /// </summary>
    /// <param name="request">引当リクエストです。</param>
    /// <param name="context">gRPC呼び出しコンテキストです。</param>
    /// <returns>引当結果です。</returns>
    public override async Task<ReserveInventoryReply> Reserve(ReserveInventoryRequest request, ServerCallContext context)
    {
        if (!Guid.TryParse(request.ProductId, out var productId))
        {
            return new ReserveInventoryReply { Success = false, ErrorCode = "invalid_product_id" };
        }

        var result = await _inventoryService.ReserveAsync(
            new ReserveInventoryCommand(productId, request.Quantity, "order_reserve"),
            context.CancellationToken);

        return result.Status switch
        {
            InventoryUpdateStatus.Success => new ReserveInventoryReply { Success = true },
            InventoryUpdateStatus.InsufficientAvailable => new ReserveInventoryReply { Success = false, ErrorCode = "insufficient_available" },
            InventoryUpdateStatus.ConcurrencyConflict => new ReserveInventoryReply { Success = false, ErrorCode = "concurrency_conflict" },
            InventoryUpdateStatus.NotFound => new ReserveInventoryReply { Success = false, ErrorCode = "product_not_found" },
            _ => new ReserveInventoryReply { Success = false, ErrorCode = "invalid_request" }
        };
    }
}
