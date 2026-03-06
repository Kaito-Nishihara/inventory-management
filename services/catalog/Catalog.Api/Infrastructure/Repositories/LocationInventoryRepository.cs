using Catalog.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Infrastructure.Repositories;

public class LocationInventoryRepository(CatalogDbContext db) : ILocationInventoryRepository
{
    private readonly CatalogDbContext _db = db;

    public Task<bool> ProductExistsAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        return _db.Products.AsNoTracking().AnyAsync(x => x.Id == productId, cancellationToken);
    }

    public async Task<IReadOnlyList<StockLocation>> GetActiveLocationsAsync(CancellationToken cancellationToken = default)
    {
        return await _db.StockLocations
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Code)
            .ToListAsync(cancellationToken);
    }

    public Task<StockLocation?> GetLocationByIdAsync(Guid locationId, CancellationToken cancellationToken = default)
    {
        return _db.StockLocations.SingleOrDefaultAsync(x => x.Id == locationId && x.IsActive, cancellationToken);
    }

    public async Task<IReadOnlyList<(StockLocation Location, LocationInventoryItem? Stock)>> GetStocksByProductIdAsync(
        Guid productId,
        CancellationToken cancellationToken = default)
    {
        var locations = await GetActiveLocationsAsync(cancellationToken);
        var stocks = await _db.LocationInventoryItems
            .Where(x => x.ProductId == productId)
            .ToListAsync(cancellationToken);

        return locations
            .Select(location => (location, stocks.SingleOrDefault(s => s.LocationId == location.Id)))
            .ToList();
    }

    public Task<LocationInventoryItem?> GetStockAsync(Guid productId, Guid locationId, CancellationToken cancellationToken = default)
    {
        return _db.LocationInventoryItems.SingleOrDefaultAsync(
            x => x.ProductId == productId && x.LocationId == locationId,
            cancellationToken);
    }

    public Task<LocationInventoryTransfer?> GetTransferByIdAsync(Guid transferId, CancellationToken cancellationToken = default)
    {
        return _db.LocationInventoryTransfers.SingleOrDefaultAsync(x => x.Id == transferId, cancellationToken);
    }

    public async Task<IReadOnlyList<LocationInventoryTransfer>> GetTransfersByProductIdAsync(
        Guid productId,
        int take = 20,
        CancellationToken cancellationToken = default)
    {
        var safeTake = Math.Clamp(take, 1, 100);
        return await _db.LocationInventoryTransfers
            .AsNoTracking()
            .Where(x => x.ProductId == productId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(safeTake)
            .ToListAsync(cancellationToken);
    }

    public void AddLocationStock(LocationInventoryItem item)
    {
        _db.LocationInventoryItems.Add(item);
    }

    public void AddTransfer(LocationInventoryTransfer transfer)
    {
        _db.LocationInventoryTransfers.Add(transfer);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
