namespace Catalog.Api.Application.Inventory;

public sealed record StockLocationResult(Guid Id, string Code, string Name, string Type);
public sealed record LocationInventoryStockResult(
    Guid LocationId,
    string LocationCode,
    string LocationName,
    string LocationType,
    int OnHand,
    int Version,
    int InTransitOut,
    int InTransitIn);
public sealed record CreateLocationTransferCommand(Guid TransferId, Guid ProductId, Guid FromLocationId, Guid ToLocationId, int Quantity, string? Note);
public sealed record LocationTransferActionCommand(Guid TransferId);

public enum TransferLocationInventoryStatus
{
    Success,
    InvalidRequest,
    TransferNotFound,
    InvalidStatus,
    ProductNotFound,
    LocationNotFound,
    InsufficientStock,
    ConcurrencyConflict
}

public sealed record TransferLocationInventoryResult(TransferLocationInventoryStatus Status);
public sealed record LocationInventoryTransferResult(
    Guid Id,
    Guid ProductId,
    Guid FromLocationId,
    Guid ToLocationId,
    int Quantity,
    string Status,
    string? Note,
    DateTime CreatedAtUtc,
    DateTime? ShippedAtUtc,
    DateTime? ReceivedAtUtc);
