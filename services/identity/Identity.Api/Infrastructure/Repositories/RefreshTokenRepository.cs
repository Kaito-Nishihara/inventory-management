using Identity.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Identity.Api.Infrastructure.Repositories;

public class RefreshTokenRepository(IdentityDbContext db) : IRefreshTokenRepository
{
    private readonly IdentityDbContext _db = db;

    /// <summary>
    /// トークンハッシュでリフレッシュトークンを取得します。
    /// </summary>
    /// <param name="tokenHash">トークンハッシュです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>リフレッシュトークン。未存在ならnullです。</returns>
    public Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        return _db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);
    }

    /// <summary>
    /// リフレッシュトークンを保存します。
    /// </summary>
    /// <param name="refreshToken">保存対象トークンです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    public async Task AddAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default)
    {
        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// リフレッシュトークン更新を保存します。
    /// </summary>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
