namespace Identity.Api.Domain;

public class User
{
    public Guid Id { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string Role { get; private set; } = "user";
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;

    /// <summary>
    /// ユーザーを生成します。
    /// </summary>
    /// <param name="email">メールアドレスです。</param>
    /// <param name="role">ロールです。</param>
    /// <returns>作成したユーザーです。</returns>
    public static User Create(string email, string role = "user")
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = NormalizeEmail(email),
            Role = role,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    /// <summary>
    /// メールアドレスを正規化します。
    /// </summary>
    /// <param name="email">入力メールです。</param>
    /// <returns>正規化したメールです。</returns>
    public static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    /// <summary>
    /// パスワードハッシュを設定します。
    /// </summary>
    /// <param name="passwordHash">保存用ハッシュです。</param>
    public void SetPasswordHash(string passwordHash)
    {
        PasswordHash = passwordHash;
    }
}
