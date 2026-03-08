using Catalog.Api.Application.Inventory;
using Backend.Validation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("admin/inventory")]
[Authorize(Roles = "admin")]
public class AdminInventoryController(IInventoryService inventoryService) : ControllerBase
{
    private readonly IInventoryService _inventoryService = inventoryService;

    /// <summary>
    /// 入庫を実行します。
    /// </summary>
    /// <param name="request">入庫リクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    [HttpPost("receive")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Receive([FromBody] ReceiveInventoryRequest request, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.ReceiveAsync(
            new ReceiveInventoryCommand(request.ProductId, request.Quantity, request.ExpectedVersion, request.Note),
            cancellationToken);
        return ToActionResult(result);
    }

    /// <summary>
    /// 出庫を実行します。
    /// </summary>
    /// <param name="request">出庫リクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    [HttpPost("issue")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Issue([FromBody] IssueInventoryRequest request, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.IssueAsync(
            new IssueInventoryCommand(request.ProductId, request.Quantity, request.ExpectedVersion, request.Note),
            cancellationToken);
        return ToActionResult(result);
    }

    /// <summary>
    /// 棚卸調整を実行します。
    /// </summary>
    /// <param name="request">棚卸リクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>更新結果です。</returns>
    [HttpPost("adjust")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Adjust([FromBody] AdjustInventoryRequest request, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.AdjustAsync(
            new AdjustInventoryCommand(request.ProductId, request.NewOnHand, request.ExpectedVersion, request.Note),
            cancellationToken);
        return ToActionResult(result);
    }

    /// <summary>
    /// 商品単位の在庫履歴を取得します。
    /// </summary>
    /// <param name="productId">商品IDです。</param>
    /// <param name="take">取得件数です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>在庫履歴です。</returns>
    [HttpGet("{productId:guid}/transactions")]
    [ProducesResponseType(typeof(IReadOnlyList<InventoryTransactionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListTransactions(
        Guid productId,
        [FromQuery] int take = 20,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null,
        CancellationToken cancellationToken = default)
    {
        var rows = await _inventoryService.GetTransactionsAsync(productId, take, fromUtc, toUtc, cancellationToken);
        return Ok(rows.Select(x => new InventoryTransactionResponse(
            x.Id,
            x.ProductId,
            x.Type,
            x.QuantityDelta,
            x.OnHandAfter,
            x.ReservedAfter,
            x.Note,
            x.CreatedAtUtc)).ToList());
    }

    /// <summary>
    /// 有効なロケーション一覧を取得します。
    /// </summary>
    [HttpGet("locations")]
    [ProducesResponseType(typeof(IReadOnlyList<StockLocationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListLocations(CancellationToken cancellationToken = default)
    {
        var rows = await _inventoryService.GetLocationsAsync(cancellationToken);
        return Ok(rows.Select(x => new StockLocationResponse(x.Id, x.Code, x.Name, x.Type)).ToList());
    }

    /// <summary>
    /// 商品単位のロケーション別在庫を取得します。
    /// </summary>
    [HttpGet("{productId:guid}/location-stocks")]
    [ProducesResponseType(typeof(IReadOnlyList<LocationInventoryStockResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListLocationStocks(Guid productId, CancellationToken cancellationToken = default)
    {
        var rows = await _inventoryService.GetLocationStocksAsync(productId, cancellationToken);
        return Ok(rows.Select(x => new LocationInventoryStockResponse(
            x.LocationId,
            x.LocationCode,
            x.LocationName,
            x.LocationType,
            x.OnHand,
            x.Version,
            x.InTransitOut,
            x.InTransitIn)).ToList());
    }

    /// <summary>
    /// ロケーション間在庫移動指示を作成します。
    /// </summary>
    [HttpPost("transfers")]
    [ProducesResponseType(typeof(LocationTransferCreatedResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateLocationTransfer([FromBody] TransferLocationInventoryRequest request, CancellationToken cancellationToken)
    {
        var transferId = Guid.NewGuid();
        var result = await _inventoryService.CreateLocationTransferAsync(
            new CreateLocationTransferCommand(
                transferId,
                request.ProductId,
                request.FromLocationId,
                request.ToLocationId,
                request.Quantity,
                request.Note),
            cancellationToken);
        return ToTransferActionResult(result, transferId);
    }

    /// <summary>
    /// 移動指示を出荷済みに更新します。
    /// </summary>
    [HttpPost("transfers/{transferId:guid}/ship")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ShipLocationTransfer(Guid transferId, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.ShipLocationTransferAsync(new LocationTransferActionCommand(transferId), cancellationToken);
        return ToTransferActionResult(result);
    }

    /// <summary>
    /// 出荷済み移動を入荷済みに更新します。
    /// </summary>
    [HttpPost("transfers/{transferId:guid}/receive")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ReceiveLocationTransfer(Guid transferId, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.ReceiveLocationTransferAsync(new LocationTransferActionCommand(transferId), cancellationToken);
        return ToTransferActionResult(result);
    }

    /// <summary>
    /// 移動指示を取消します。
    /// </summary>
    [HttpPost("transfers/{transferId:guid}/cancel")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CancelLocationTransfer(Guid transferId, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.CancelLocationTransferAsync(new LocationTransferActionCommand(transferId), cancellationToken);
        return ToTransferActionResult(result);
    }

    /// <summary>
    /// 商品単位のロケーション移動履歴を取得します。
    /// </summary>
    [HttpGet("{productId:guid}/transfers")]
    [ProducesResponseType(typeof(IReadOnlyList<LocationInventoryTransferResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListLocationTransfers(
        Guid productId,
        [FromQuery] int take = 20,
        CancellationToken cancellationToken = default)
    {
        var rows = await _inventoryService.GetLocationTransfersAsync(productId, take, cancellationToken);
        return Ok(rows.Select(x => new LocationInventoryTransferResponse(
            x.Id,
            x.ProductId,
            x.FromLocationId,
            x.ToLocationId,
            x.Quantity,
            x.Status,
            x.Note,
            x.CreatedAtUtc,
            x.ShippedAtUtc,
            x.ReceivedAtUtc)).ToList());
    }

    /// <summary>
    /// 更新結果をHTTPレスポンスへ変換します。
    /// </summary>
    /// <param name="result">在庫更新結果です。</param>
    /// <returns>HTTPレスポンスです。</returns>
    private IActionResult ToActionResult(InventoryUpdateResult result)
    {
        return result.Status switch
        {
            InventoryUpdateStatus.Success => NoContent(),
            InventoryUpdateStatus.NotFound => NotFound(),
            InventoryUpdateStatus.VersionConflict => Conflict("version_conflict"),
            InventoryUpdateStatus.InsufficientAvailable => Conflict("insufficient_available"),
            InventoryUpdateStatus.InvalidOnHand => BadRequest("invalid_on_hand"),
            _ => BadRequest("invalid_quantity")
        };
    }

    /// <summary>
    /// ロケーション移動結果をHTTPレスポンスへ変換します。
    /// </summary>
    private IActionResult ToTransferActionResult(TransferLocationInventoryResult result, Guid? createdTransferId = null)
    {
        return result.Status switch
        {
            TransferLocationInventoryStatus.Success when createdTransferId.HasValue => Created($"/admin/inventory/transfers/{createdTransferId.Value}", new LocationTransferCreatedResponse(createdTransferId.Value)),
            TransferLocationInventoryStatus.Success => NoContent(),
            TransferLocationInventoryStatus.TransferNotFound => NotFound("transfer_not_found"),
            TransferLocationInventoryStatus.ProductNotFound => NotFound("product_not_found"),
            TransferLocationInventoryStatus.LocationNotFound => NotFound("location_not_found"),
            TransferLocationInventoryStatus.InsufficientStock => Conflict("insufficient_stock"),
            TransferLocationInventoryStatus.ConcurrencyConflict => Conflict("concurrency_conflict"),
            TransferLocationInventoryStatus.InvalidStatus => Conflict("invalid_status"),
            _ => BadRequest("invalid_request")
        };
    }
}

public sealed record ReceiveInventoryRequest(
    [NonEmptyGuid(ErrorMessage = ValidationCodes.NonEmptyGuid)] Guid ProductId,
    [Range(1, int.MaxValue, ErrorMessage = ValidationCodes.Range)] int Quantity,
    [Range(0, int.MaxValue, ErrorMessage = ValidationCodes.Range)] int ExpectedVersion,
    [StringLength(512, ErrorMessage = ValidationCodes.StringLength)] string? Note);
public sealed record IssueInventoryRequest(
    [NonEmptyGuid(ErrorMessage = ValidationCodes.NonEmptyGuid)] Guid ProductId,
    [Range(1, int.MaxValue, ErrorMessage = ValidationCodes.Range)] int Quantity,
    [Range(0, int.MaxValue, ErrorMessage = ValidationCodes.Range)] int ExpectedVersion,
    [StringLength(512, ErrorMessage = ValidationCodes.StringLength)] string? Note);
public sealed record AdjustInventoryRequest(
    [NonEmptyGuid(ErrorMessage = ValidationCodes.NonEmptyGuid)] Guid ProductId,
    [Range(0, int.MaxValue, ErrorMessage = ValidationCodes.Range)] int NewOnHand,
    [Range(0, int.MaxValue, ErrorMessage = ValidationCodes.Range)] int ExpectedVersion,
    [StringLength(512, ErrorMessage = ValidationCodes.StringLength)] string? Note);
public sealed record InventoryTransactionResponse(
    Guid Id,
    Guid ProductId,
    string Type,
    int QuantityDelta,
    int OnHandAfter,
    int ReservedAfter,
    string? Note,
    DateTime CreatedAtUtc);
public sealed record StockLocationResponse(Guid Id, string Code, string Name, string Type);
public sealed record LocationInventoryStockResponse(
    Guid LocationId,
    string LocationCode,
    string LocationName,
    string LocationType,
    int OnHand,
    int Version,
    int InTransitOut,
    int InTransitIn);
public sealed record TransferLocationInventoryRequest(
    [NonEmptyGuid(ErrorMessage = ValidationCodes.NonEmptyGuid)] Guid ProductId,
    [NonEmptyGuid(ErrorMessage = ValidationCodes.NonEmptyGuid)] Guid FromLocationId,
    [NonEmptyGuid(ErrorMessage = ValidationCodes.NonEmptyGuid)] Guid ToLocationId,
    [Range(1, int.MaxValue, ErrorMessage = ValidationCodes.Range)] int Quantity,
    [StringLength(512, ErrorMessage = ValidationCodes.StringLength)] string? Note);
public sealed record LocationTransferCreatedResponse(Guid TransferId);
public sealed record LocationInventoryTransferResponse(
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
