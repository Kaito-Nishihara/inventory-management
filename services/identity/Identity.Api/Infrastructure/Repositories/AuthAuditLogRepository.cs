using Identity.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Identity.Api.Infrastructure.Repositories;

public class AuthAuditLogRepository(IdentityDbContext db) : IAuthAuditLogRepository
{
    private readonly IdentityDbContext _db = db;

    /// <summary>
    /// 監査ログを保存します。
    /// </summary>
    /// <param name="log">保存対象ログです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    public async Task AddAsync(AuthAuditLog log, CancellationToken cancellationToken = default)
    {
        _db.AuthAuditLogs.Add(log);
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// 認証監査ログを新しい順に取得します。
    /// </summary>
    /// <param name="take">取得件数です。</param>
    /// <param name="fromUtc">取得開始日時(UTC)です。</param>
    /// <param name="toUtc">取得終了日時(UTC)です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>監査ログ一覧です。</returns>
    public async Task<IReadOnlyList<AuthAuditLog>> ListAsync(
        int take = 50,
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        CancellationToken cancellationToken = default)
    {
        var safeTake = Math.Clamp(take, 1, 200);
        var query = _db.AuthAuditLogs.AsNoTracking();

        if (fromUtc.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc < toUtc.Value);
        }

        return await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(safeTake)
            .ToListAsync(cancellationToken);
    }
}
