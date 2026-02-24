using Order.Api.Domain;
using Order.Api.Infrastructure.Clients;
using Order.Api.Infrastructure.Repositories;

namespace Order.Api.Application.Orders;

/// <summary>
/// 注文ユースケースの実装です。
/// </summary>
public class OrderService(IOrderRepository orderRepository, IInventoryReservationGateway inventoryGateway) : IOrderService
{
    private readonly IOrderRepository _orderRepository = orderRepository;
    private readonly IInventoryReservationGateway _inventoryGateway = inventoryGateway;

    /// <summary>
    /// 在庫引当を行ったうえで注文を作成します。
    /// </summary>
    /// <param name="command">注文作成コマンドです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>作成結果です。</returns>
    public async Task<CreateOrderResult> CreateAsync(CreateOrderCommand command, CancellationToken cancellationToken = default)
    {
        if (command.Quantity <= 0)
        {
            return new CreateOrderResult(CreateOrderStatus.InvalidQuantity);
        }

        var reserve = await _inventoryGateway.ReserveAsync(command.ProductId, command.Quantity, cancellationToken);
        if (!reserve.Success)
        {
            return new CreateOrderResult(CreateOrderStatus.InventoryUnavailable);
        }

        var order = Order.Api.Domain.Order.Create(command.UserId, command.ProductId, command.Quantity);
        await _orderRepository.AddAsync(order, cancellationToken);
        return new CreateOrderResult(CreateOrderStatus.Created, order.Id);
    }

    /// <summary>
    /// 単一注文を取得します。
    /// </summary>
    /// <param name="orderId">注文IDです。</param>
    /// <param name="userId">呼び出しユーザーIDです。</param>
    /// <param name="isAdmin">管理者かどうかです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文詳細です。閲覧不可または未存在時はnullです。</returns>
    public async Task<OrderQueryResult?> GetByIdAsync(Guid orderId, string? userId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(orderId, cancellationToken);
        if (order is null)
        {
            return null;
        }

        if (!isAdmin && userId != order.UserId)
        {
            return null;
        }

        return Map(order);
    }

    /// <summary>
    /// 条件に応じた注文一覧を取得します。
    /// </summary>
    /// <param name="userId">呼び出しユーザーIDです。</param>
    /// <param name="isAdmin">管理者かどうかです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>注文一覧です。</returns>
    public async Task<IReadOnlyList<OrderQueryResult>> GetListAsync(string? userId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var orders = isAdmin
            ? await _orderRepository.GetAllAsync(cancellationToken)
            : await _orderRepository.GetByUserIdAsync(userId ?? string.Empty, cancellationToken);

        return orders.Select(Map).ToList();
    }

    /// <summary>
    /// 注文ステータスを変更します。
    /// </summary>
    /// <param name="command">ステータス変更コマンドです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>変更結果です。</returns>
    public async Task<ChangeOrderStatusResult> ChangeStatusAsync(ChangeOrderStatusCommand command, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(command.OrderId, cancellationToken);
        if (order is null)
        {
            return ChangeOrderStatusResult.NotFound;
        }

        if (order.Status == OrderStatuses.Accepted && command.NextStatus == OrderStatuses.Cancelled)
        {
            foreach (var item in order.Items)
            {
                var release = await _inventoryGateway.ReleaseAsync(item.ProductId, item.Quantity, cancellationToken);
                if (!release.Success)
                {
                    return ChangeOrderStatusResult.InventoryReleaseFailed;
                }
            }
        }

        if (!order.TryChangeStatus(command.NextStatus))
        {
            return ChangeOrderStatusResult.InvalidTransition;
        }

        await _orderRepository.SaveChangesAsync(cancellationToken);
        return ChangeOrderStatusResult.Success;
    }

    private static OrderQueryResult Map(Order.Api.Domain.Order x)
    {
        return new OrderQueryResult(
            x.Id,
            x.UserId,
            x.Status,
            x.CreatedAtUtc,
            x.UpdatedAtUtc,
            x.Items.Select(i => new OrderItemResult(i.ProductId, i.Quantity)).ToList());
    }
}
