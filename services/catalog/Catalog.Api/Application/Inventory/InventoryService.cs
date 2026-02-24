using Catalog.Api.Domain;
using Catalog.Api.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Application.Inventory;

public class InventoryService(IInventoryRepository inventoryRepository) : IInventoryService
{
    private readonly IInventoryRepository _inventoryRepository = inventoryRepository;

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
}
