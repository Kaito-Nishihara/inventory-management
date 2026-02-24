using Identity.Api.Domain;

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
}
