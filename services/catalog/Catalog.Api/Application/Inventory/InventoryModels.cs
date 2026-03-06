namespace Catalog.Api.Application.Inventory;

public sealed record ReceiveInventoryCommand(Guid ProductId, int Quantity, int ExpectedVersion, string? Note);
public sealed record IssueInventoryCommand(Guid ProductId, int Quantity, int ExpectedVersion, string? Note);
public sealed record AdjustInventoryCommand(Guid ProductId, int NewOnHand, int ExpectedVersion, string? Note);
public sealed record ReserveInventoryCommand(Guid ProductId, int Quantity, string? Note);
public sealed record ReleaseInventoryCommand(Guid ProductId, int Quantity, string? Note);

public enum InventoryUpdateStatus
{
    Success,
    NotFound,
    InvalidQuantity,
    InsufficientAvailable,
    VersionConflict,
    InvalidOnHand,
    ConcurrencyConflict
}

public sealed record InventoryUpdateResult(InventoryUpdateStatus Status);
public sealed record InventoryTransactionResult(
    Guid Id,
    Guid ProductId,
    string Type,
    int QuantityDelta,
    int OnHandAfter,
    int ReservedAfter,
    string? Note,
    DateTime CreatedAtUtc);
