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
    /// <returns>成功時はアクセストークン/リフレッシュトークン、失敗時はnullです。</returns>
    Task<AuthTokensResult?> LoginAsync(LoginCommand command, CancellationToken cancellationToken = default);

    /// <summary>
    /// リフレッシュトークンで再発行します。
    /// </summary>
    /// <param name="command">再発行情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>成功時は新しいアクセストークン/リフレッシュトークン、失敗時はnullです。</returns>
    Task<AuthTokensResult?> RefreshAsync(RefreshCommand command, CancellationToken cancellationToken = default);

    /// <summary>
    /// リフレッシュトークンを失効します。
    /// </summary>
    /// <param name="command">失効情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>失効できた場合はtrueです。</returns>
    Task<bool> RevokeAsync(RevokeCommand command, CancellationToken cancellationToken = default);
}
