using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using Order.Api.Application.Orders;
using Backend.Validation;
using Backend.Validation.Authorization;
using Order.Api.Security;

namespace Order.Api.Controllers;

[ApiController]
[Route("orders")]
[Authorize(Policy = OrderPolicies.OrdersRead)]
/// <summary>
/// 注文APIを提供します。
/// </summary>
public class OrdersController(IOrderService orderService) : ControllerBase
{
    private readonly IOrderService _orderService = orderService;

    /// <summary>
    /// 注文を作成します。
    /// </summary>
    /// <param name="request">注文作成リクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>作成結果です。</returns>
    [HttpPost]
    [ProducesResponseType(typeof(CreateOrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var result = await _orderService.CreateAsync(new CreateOrderCommand(userId, request.ProductId, request.Quantity), cancellationToken);

        return result.Status switch
        {
            CreateOrderStatus.Created => Created($"/orders/{result.OrderId}", new CreateOrderResponse(result.OrderId!.Value)),
            CreateOrderStatus.InventoryUnavailable => Conflict("insufficient_available"),
            _ => BadRequest("invalid_quantity")
        };
    }

    /// <summary>
    /// 注文一覧を取得します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文一覧です。</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<OrderResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var isAdmin = User.IsInRole(AppRoles.Admin);
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var orders = await _orderService.GetListAsync(userId, isAdmin, cancellationToken);
        return Ok(orders.Select(Map).ToList());
    }

    /// <summary>
    /// 注文詳細を取得します。
    /// </summary>
    /// <param name="orderId">注文IDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文詳細です。</returns>
    [HttpGet("{orderId:guid}")]
    [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid orderId, CancellationToken cancellationToken)
    {
        var isAdmin = User.IsInRole(AppRoles.Admin);
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var order = await _orderService.GetByIdAsync(orderId, userId, isAdmin, cancellationToken);
        if (order is null)
        {
            return NotFound();
        }

        return Ok(Map(order));
    }

    private static OrderResponse Map(OrderQueryResult x)
    {
        return new OrderResponse(
            x.Id,
            x.UserId,
            x.Status,
            x.CreatedAtUtc,
            x.UpdatedAtUtc,
            x.Items.Select(i => new OrderItemResponse(i.ProductId, i.Quantity)).ToList(),
            x.StatusHistories.Select(h => new OrderStatusHistoryResponse(
                h.Id,
                h.Status,
                h.Note,
                h.CreatedAtUtc)).ToList());
    }
}

[ApiController]
[Route("admin/orders")]
[Authorize(Policy = OrderPolicies.OrdersManage)]
/// <summary>
/// 管理者向け注文APIを提供します。
/// </summary>
public class AdminOrdersController(IOrderService orderService) : ControllerBase
{
    private readonly IOrderService _orderService = orderService;

    /// <summary>
    /// 注文ステータスを変更します。
    /// </summary>
    /// <param name="orderId">注文IDです。</param>
    /// <param name="request">ステータス変更リクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>変更結果です。</returns>
    [HttpPost("{orderId:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ChangeStatus(Guid orderId, [FromBody] ChangeOrderStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await _orderService.ChangeStatusAsync(new ChangeOrderStatusCommand(orderId, request.NextStatus), cancellationToken);
        return result switch
        {
            ChangeOrderStatusResult.Success => NoContent(),
            ChangeOrderStatusResult.NotFound => NotFound(),
            ChangeOrderStatusResult.InventoryReleaseFailed => Conflict("inventory_release_failed"),
            _ => Conflict("invalid_transition")
        };
    }
}

public sealed record CreateOrderRequest(
    [NonEmptyGuid(ErrorMessage = ValidationCodes.NonEmptyGuid)] Guid ProductId,
    [Range(1, int.MaxValue, ErrorMessage = ValidationCodes.Range)] int Quantity);
public sealed record CreateOrderResponse(Guid OrderId);
public sealed record ChangeOrderStatusRequest(
    [Required(ErrorMessage = ValidationCodes.Required), StringLength(50, MinimumLength = 1, ErrorMessage = ValidationCodes.StringLength)] string NextStatus);
public sealed record OrderResponse(
    Guid Id,
    string UserId,
    string Status,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    IReadOnlyList<OrderItemResponse> Items,
    IReadOnlyList<OrderStatusHistoryResponse> StatusHistories);
public sealed record OrderItemResponse(Guid ProductId, int Quantity);
public sealed record OrderStatusHistoryResponse(Guid Id, string Status, string Note, DateTime CreatedAtUtc);
