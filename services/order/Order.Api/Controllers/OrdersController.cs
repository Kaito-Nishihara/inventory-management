using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Order.Api.Application.Orders;

namespace Order.Api.Controllers;

[ApiController]
[Route("orders")]
[Authorize]
public class OrdersController(IOrderService orderService) : ControllerBase
{
    private readonly IOrderService _orderService = orderService;

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

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<OrderResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var isAdmin = User.IsInRole("admin");
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var orders = await _orderService.GetListAsync(userId, isAdmin, cancellationToken);
        return Ok(orders.Select(Map).ToList());
    }

    [HttpGet("{orderId:guid}")]
    [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid orderId, CancellationToken cancellationToken)
    {
        var isAdmin = User.IsInRole("admin");
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
            x.Items.Select(i => new OrderItemResponse(i.ProductId, i.Quantity)).ToList());
    }
}

[ApiController]
[Route("admin/orders")]
[Authorize(Roles = "admin")]
public class AdminOrdersController(IOrderService orderService) : ControllerBase
{
    private readonly IOrderService _orderService = orderService;

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
            _ => Conflict("invalid_transition")
        };
    }
}

public sealed record CreateOrderRequest(Guid ProductId, int Quantity);
public sealed record CreateOrderResponse(Guid OrderId);
public sealed record ChangeOrderStatusRequest(string NextStatus);
public sealed record OrderResponse(
    Guid Id,
    string UserId,
    string Status,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    IReadOnlyList<OrderItemResponse> Items);
public sealed record OrderItemResponse(Guid ProductId, int Quantity);
