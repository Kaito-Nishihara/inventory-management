namespace Identity.Api.Domain;

public class RefreshToken
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime? RevokedAtUtc { get; private set; }
    public string? ReplacedByTokenHash { get; private set; }

    /// <summary>
    /// リフレッシュトークンを生成します。
    /// </summary>
    /// <param name="userId">対象ユーザーIDです。</param>
    /// <param name="tokenHash">保存用ハッシュです。</param>
    /// <param name="expiresAtUtc">有効期限です。</param>
    /// <returns>作成したトークンです。</returns>
    public static RefreshToken Create(Guid userId, string tokenHash, DateTime expiresAtUtc)
    {
        return new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAtUtc = expiresAtUtc,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    /// <summary>
    /// 失効可能かを返します。
    /// </summary>
    /// <param name="nowUtc">現在UTC時刻です。</param>
    /// <returns>有効ならtrueです。</returns>
    public bool IsActive(DateTime nowUtc)
    {
        return RevokedAtUtc is null && ExpiresAtUtc > nowUtc;
    }

    /// <summary>
    /// トークンを失効します。
    /// </summary>
    /// <param name="nowUtc">失効時刻です。</param>
    /// <param name="replacedByTokenHash">置換先トークンハッシュです。</param>
    public void Revoke(DateTime nowUtc, string? replacedByTokenHash = null)
    {
        RevokedAtUtc = nowUtc;
        ReplacedByTokenHash = replacedByTokenHash;
    }
}
