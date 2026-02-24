using Catalog.Api.Application.Inventory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
}

public sealed record ReceiveInventoryRequest(Guid ProductId, int Quantity, int ExpectedVersion, string? Note);
public sealed record IssueInventoryRequest(Guid ProductId, int Quantity, int ExpectedVersion, string? Note);
public sealed record AdjustInventoryRequest(Guid ProductId, int NewOnHand, int ExpectedVersion, string? Note);
