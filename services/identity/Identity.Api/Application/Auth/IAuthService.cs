namespace Identity.Api.Application.Auth;

public interface IAuthService
{
    /// <summary>
    /// ユーザーを登録します。
    /// </summary>
    /// <param name="command">登録情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>登録結果です。</returns>
    Task<RegisterResult> RegisterAsync(RegisterCommand command, CancellationToken cancellationToken = default);

    /// <summary>
    /// ログインを実行します。
    /// </summary>
    /// <param name="command">ログイン情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>成功時はトークン情報、失敗時はnullです。</returns>
    Task<LoginResult?> LoginAsync(LoginCommand command, CancellationToken cancellationToken = default);
}
