namespace Order.Api.Domain;

/// <summary>
/// 注文明細です。
/// </summary>
public class OrderItem
{
    public Guid Id { get; private set; }
    public Guid OrderId { get; private set; }
    public Guid ProductId { get; private set; }
    public int Quantity { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    /// <summary>
    /// 注文明細を生成します。
    /// </summary>
    /// <param name="orderId">注文IDです。</param>
    /// <param name="productId">商品IDです。</param>
    /// <param name="quantity">数量です。</param>
    /// <returns>作成した注文明細です。</returns>
    public static OrderItem Create(Guid orderId, Guid productId, int quantity)
    {
        return new OrderItem
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            ProductId = productId,
            Quantity = quantity,
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
