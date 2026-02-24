namespace Order.Api.Domain;

/// <summary>
/// 注文ステータス履歴です。
/// </summary>
public class OrderStatusHistory
{
    public Guid Id { get; private set; }
    public Guid OrderId { get; private set; }
    public string Status { get; private set; } = string.Empty;
    public string Note { get; private set; } = string.Empty;
    public DateTime CreatedAtUtc { get; private set; }

    /// <summary>
    /// ステータス履歴を生成します。
    /// </summary>
    /// <param name="orderId">注文IDです。</param>
    /// <param name="status">ステータスです。</param>
    /// <param name="note">補足メモです。</param>
    /// <returns>作成した履歴です。</returns>
    public static OrderStatusHistory Create(Guid orderId, string status, string note)
    {
        return new OrderStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Status = status,
            Note = note,
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
