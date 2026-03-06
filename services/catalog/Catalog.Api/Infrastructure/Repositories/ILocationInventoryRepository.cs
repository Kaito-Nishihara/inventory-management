using Catalog.Api.Domain;

namespace Catalog.Api.Infrastructure.Repositories;

public interface ILocationInventoryRepository
{
    Task<bool> ProductExistsAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StockLocation>> GetActiveLocationsAsync(CancellationToken cancellationToken = default);
    Task<StockLocation?> GetLocationByIdAsync(Guid locationId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<(StockLocation Location, LocationInventoryItem? Stock)>> GetStocksByProductIdAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<LocationInventoryItem?> GetStockAsync(Guid productId, Guid locationId, CancellationToken cancellationToken = default);
    Task<LocationInventoryTransfer?> GetTransferByIdAsync(Guid transferId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LocationInventoryTransfer>> GetTransfersByProductIdAsync(Guid productId, int take = 20, CancellationToken cancellationToken = default);
    void AddLocationStock(LocationInventoryItem item);
    void AddTransfer(LocationInventoryTransfer transfer);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
