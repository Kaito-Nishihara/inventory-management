using Identity.Api.Domain;

namespace Identity.Api.Infrastructure.Repositories;

public interface IRefreshTokenRepository
{
    /// <summary>
    /// トークンハッシュでリフレッシュトークンを取得します。
    /// </summary>
    /// <param name="tokenHash">トークンハッシュです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>リフレッシュトークン。未存在ならnullです。</returns>
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);

    /// <summary>
    /// リフレッシュトークンを保存します。
    /// </summary>
    /// <param name="refreshToken">保存対象トークンです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    Task AddAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// リフレッシュトークン更新を保存します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
