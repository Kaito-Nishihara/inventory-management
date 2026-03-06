using Catalog.Api.Domain;
using Catalog.Api.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Application.Inventory;

public class InventoryService(
    IInventoryRepository inventoryRepository,
    ILocationInventoryRepository locationInventoryRepository) : IInventoryService
{
    private readonly IInventoryRepository _inventoryRepository = inventoryRepository;
    private readonly ILocationInventoryRepository _locationInventoryRepository = locationInventoryRepository;

    /// <summary>
    /// 入庫を行います。
    /// </summary>
    /// <param name="command">入庫情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    public async Task<InventoryUpdateResult> ReceiveAsync(ReceiveInventoryCommand command, CancellationToken cancellationToken = default)
    {
        if (command.Quantity <= 0)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.InvalidQuantity);
        }

        var inventory = await _inventoryRepository.GetByProductIdAsync(command.ProductId, cancellationToken);
        if (inventory is null)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.NotFound);
        }

        if (inventory.Version != command.ExpectedVersion)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.VersionConflict);
        }

        if (!inventory.TryReceive(command.Quantity))
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.InvalidQuantity);
        }

        _inventoryRepository.AddTransaction(InventoryTransaction.Create(
            command.ProductId,
            "receive",
            command.Quantity,
            inventory.OnHand,
            inventory.Reserved,
            command.Note));

        await _inventoryRepository.SaveChangesAsync(cancellationToken);
        return new InventoryUpdateResult(InventoryUpdateStatus.Success);
    }

    /// <summary>
    /// 出庫を行います。
    /// </summary>
    /// <param name="command">出庫情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    public async Task<InventoryUpdateResult> IssueAsync(IssueInventoryCommand command, CancellationToken cancellationToken = default)
    {
        if (command.Quantity <= 0)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.InvalidQuantity);
        }

        var inventory = await _inventoryRepository.GetByProductIdAsync(command.ProductId, cancellationToken);
        if (inventory is null)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.NotFound);
        }

        if (inventory.Version != command.ExpectedVersion)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.VersionConflict);
        }

        if (!inventory.TryIssue(command.Quantity))
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.InsufficientAvailable);
        }

        _inventoryRepository.AddTransaction(InventoryTransaction.Create(
            command.ProductId,
            "issue",
            -command.Quantity,
            inventory.OnHand,
            inventory.Reserved,
            command.Note));

        await _inventoryRepository.SaveChangesAsync(cancellationToken);
        return new InventoryUpdateResult(InventoryUpdateStatus.Success);
    }

    /// <summary>
    /// 棚卸調整を行います。
    /// </summary>
    /// <param name="command">棚卸情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    public async Task<InventoryUpdateResult> AdjustAsync(AdjustInventoryCommand command, CancellationToken cancellationToken = default)
    {
        var inventory = await _inventoryRepository.GetByProductIdAsync(command.ProductId, cancellationToken);
        if (inventory is null)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.NotFound);
        }

        if (inventory.Version != command.ExpectedVersion)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.VersionConflict);
        }

        var delta = command.NewOnHand - inventory.OnHand;
        if (!inventory.TryAdjust(command.NewOnHand))
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.InvalidOnHand);
        }

        _inventoryRepository.AddTransaction(InventoryTransaction.Create(
            command.ProductId,
            "adjust",
            delta,
            inventory.OnHand,
            inventory.Reserved,
            command.Note));

        await _inventoryRepository.SaveChangesAsync(cancellationToken);
        return new InventoryUpdateResult(InventoryUpdateStatus.Success);
    }

    /// <summary>
    /// 注文向け在庫引当を行います。
    /// </summary>
    /// <param name="command">引当情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    public async Task<InventoryUpdateResult> ReserveAsync(ReserveInventoryCommand command, CancellationToken cancellationToken = default)
    {
        if (command.Quantity <= 0)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.InvalidQuantity);
        }

        var inventory = await _inventoryRepository.GetByProductIdAsync(command.ProductId, cancellationToken);
        if (inventory is null)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.NotFound);
        }

        if (!inventory.TryReserve(command.Quantity))
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.InsufficientAvailable);
        }

        _inventoryRepository.AddTransaction(InventoryTransaction.Create(
            command.ProductId,
            "reserve",
            0,
            inventory.OnHand,
            inventory.Reserved,
            command.Note));

        try
        {
            await _inventoryRepository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.ConcurrencyConflict);
        }

        return new InventoryUpdateResult(InventoryUpdateStatus.Success);
    }

    /// <summary>
    /// 注文キャンセル向け在庫返却を行います。
    /// </summary>
    /// <param name="command">返却情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    public async Task<InventoryUpdateResult> ReleaseAsync(ReleaseInventoryCommand command, CancellationToken cancellationToken = default)
    {
        if (command.Quantity <= 0)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.InvalidQuantity);
        }

        var inventory = await _inventoryRepository.GetByProductIdAsync(command.ProductId, cancellationToken);
        if (inventory is null)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.NotFound);
        }

        if (!inventory.TryRelease(command.Quantity))
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.InvalidQuantity);
        }

        _inventoryRepository.AddTransaction(InventoryTransaction.Create(
            command.ProductId,
            "release",
            0,
            inventory.OnHand,
            inventory.Reserved,
            command.Note));

        try
        {
            await _inventoryRepository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return new InventoryUpdateResult(InventoryUpdateStatus.ConcurrencyConflict);
        }

        return new InventoryUpdateResult(InventoryUpdateStatus.Success);
    }

    /// <summary>
    /// 商品単位の在庫トランザクション履歴を取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="take">取得件数です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>在庫履歴です。</returns>
    public async Task<IReadOnlyList<InventoryTransactionResult>> GetTransactionsAsync(
        Guid productId,
        int take = 20,
        CancellationToken cancellationToken = default)
    {
        var rows = await _inventoryRepository.GetTransactionsByProductIdAsync(productId, take, cancellationToken);
        return rows
            .Select(x => new InventoryTransactionResult(
                x.Id,
                x.ProductId,
                x.Type,
                x.QuantityDelta,
                x.OnHandAfter,
                x.ReservedAfter,
                x.Note,
                x.CreatedAtUtc))
            .ToList();
    }

    /// <summary>
    /// ロケーション一覧を取得します。
    /// </summary>
    public async Task<IReadOnlyList<StockLocationResult>> GetLocationsAsync(CancellationToken cancellationToken = default)
    {
        var locations = await _locationInventoryRepository.GetActiveLocationsAsync(cancellationToken);
        return locations
            .Select(x => new StockLocationResult(x.Id, x.Code, x.Name, x.Type))
            .ToList();
    }

    /// <summary>
    /// 商品単位のロケーション在庫を取得します。
    /// </summary>
    public async Task<IReadOnlyList<LocationInventoryStockResult>> GetLocationStocksAsync(
        Guid productId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _locationInventoryRepository.GetStocksByProductIdAsync(productId, cancellationToken);
        var transfers = await _locationInventoryRepository.GetTransfersByProductIdAsync(productId, 200, cancellationToken);
        var inTransit = transfers
            .Where(x => x.Status == LocationInventoryTransfer.StatusShipped)
            .ToList();

        var inTransitOutByLocation = inTransit
            .GroupBy(x => x.FromLocationId)
            .ToDictionary(x => x.Key, x => x.Sum(y => y.Quantity));
        var inTransitInByLocation = inTransit
            .GroupBy(x => x.ToLocationId)
            .ToDictionary(x => x.Key, x => x.Sum(y => y.Quantity));

        return rows
            .Select(x => new LocationInventoryStockResult(
                x.Location.Id,
                x.Location.Code,
                x.Location.Name,
                x.Location.Type,
                x.Stock?.OnHand ?? 0,
                x.Stock?.Version ?? 0,
                inTransitOutByLocation.GetValueOrDefault(x.Location.Id, 0),
                inTransitInByLocation.GetValueOrDefault(x.Location.Id, 0)))
            .ToList();
    }

    /// <summary>
    /// ロケーション間在庫移動を実行します。
    /// </summary>
    public async Task<TransferLocationInventoryResult> CreateLocationTransferAsync(
        CreateLocationTransferCommand command,
        CancellationToken cancellationToken = default)
    {
        if (command.Quantity <= 0 || command.FromLocationId == command.ToLocationId)
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.InvalidRequest);
        }

        if (!await _locationInventoryRepository.ProductExistsAsync(command.ProductId, cancellationToken))
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.ProductNotFound);
        }

        var fromLocation = await _locationInventoryRepository.GetLocationByIdAsync(command.FromLocationId, cancellationToken);
        var toLocation = await _locationInventoryRepository.GetLocationByIdAsync(command.ToLocationId, cancellationToken);
        if (fromLocation is null || toLocation is null)
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.LocationNotFound);
        }

        _locationInventoryRepository.AddTransfer(LocationInventoryTransfer.Create(
            command.TransferId,
            command.ProductId,
            command.FromLocationId,
            command.ToLocationId,
            command.Quantity,
            command.Note));

        try
        {
            await _locationInventoryRepository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.ConcurrencyConflict);
        }

        return new TransferLocationInventoryResult(TransferLocationInventoryStatus.Success);
    }

    /// <summary>
    /// 移動指示を出荷済みに更新します。
    /// </summary>
    public async Task<TransferLocationInventoryResult> ShipLocationTransferAsync(
        LocationTransferActionCommand command,
        CancellationToken cancellationToken = default)
    {
        var transfer = await _locationInventoryRepository.GetTransferByIdAsync(command.TransferId, cancellationToken);
        if (transfer is null)
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.TransferNotFound);
        }

        if (!transfer.TryMarkShipped())
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.InvalidStatus);
        }

        var fromStock = await _locationInventoryRepository.GetStockAsync(transfer.ProductId, transfer.FromLocationId, cancellationToken);
        if (fromStock is null || !fromStock.TryDecrease(transfer.Quantity))
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.InsufficientStock);
        }

        try
        {
            await _locationInventoryRepository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.ConcurrencyConflict);
        }

        return new TransferLocationInventoryResult(TransferLocationInventoryStatus.Success);
    }

    /// <summary>
    /// 出荷済みの移動を入荷済みに更新します。
    /// </summary>
    public async Task<TransferLocationInventoryResult> ReceiveLocationTransferAsync(
        LocationTransferActionCommand command,
        CancellationToken cancellationToken = default)
    {
        var transfer = await _locationInventoryRepository.GetTransferByIdAsync(command.TransferId, cancellationToken);
        if (transfer is null)
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.TransferNotFound);
        }

        if (!transfer.TryMarkReceived())
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.InvalidStatus);
        }

        var toStock = await _locationInventoryRepository.GetStockAsync(transfer.ProductId, transfer.ToLocationId, cancellationToken);
        if (toStock is null)
        {
            toStock = LocationInventoryItem.Create(transfer.ProductId, transfer.ToLocationId, 0);
            _locationInventoryRepository.AddLocationStock(toStock);
        }

        if (!toStock.TryIncrease(transfer.Quantity))
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.InvalidRequest);
        }

        try
        {
            await _locationInventoryRepository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.ConcurrencyConflict);
        }

        return new TransferLocationInventoryResult(TransferLocationInventoryStatus.Success);
    }

    /// <summary>
    /// 移動指示を取消します。
    /// </summary>
    public async Task<TransferLocationInventoryResult> CancelLocationTransferAsync(
        LocationTransferActionCommand command,
        CancellationToken cancellationToken = default)
    {
        var transfer = await _locationInventoryRepository.GetTransferByIdAsync(command.TransferId, cancellationToken);
        if (transfer is null)
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.TransferNotFound);
        }

        if (!transfer.TryCancel())
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.InvalidStatus);
        }

        try
        {
            await _locationInventoryRepository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return new TransferLocationInventoryResult(TransferLocationInventoryStatus.ConcurrencyConflict);
        }

        return new TransferLocationInventoryResult(TransferLocationInventoryStatus.Success);
    }

    /// <summary>
    /// 商品単位のロケーション移動履歴を取得します。
    /// </summary>
    public async Task<IReadOnlyList<LocationInventoryTransferResult>> GetLocationTransfersAsync(
        Guid productId,
        int take = 20,
        CancellationToken cancellationToken = default)
    {
        var rows = await _locationInventoryRepository.GetTransfersByProductIdAsync(productId, take, cancellationToken);
        return rows
            .Select(x => new LocationInventoryTransferResult(
                x.Id,
                x.ProductId,
                x.FromLocationId,
                x.ToLocationId,
                x.Quantity,
                x.Status,
                x.Note,
                x.CreatedAtUtc,
                x.ShippedAtUtc,
                x.ReceivedAtUtc))
            .ToList();
    }
}
