namespace Identity.Api.Domain;

public class AuthAuditLog
{
    public Guid Id { get; private set; }
    public Guid? UserId { get; private set; }
    public string Action { get; private set; } = string.Empty;
    public bool Success { get; private set; }
    public string? Detail { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    /// <summary>
    /// 認証監査ログを生成します。
    /// </summary>
    /// <param name="action">操作名です。</param>
    /// <param name="success">成功可否です。</param>
    /// <param name="userId">対象ユーザーIDです。</param>
    /// <param name="detail">補足情報です。</param>
    /// <returns>作成した監査ログです。</returns>
    public static AuthAuditLog Create(string action, bool success, Guid? userId = null, string? detail = null)
    {
        return new AuthAuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            Success = success,
            Detail = detail,
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
