using Identity.Api.Domain;

namespace Identity.Api.Infrastructure.Repositories;

public interface IAuthAuditLogRepository
{
    /// <summary>
    /// 監査ログを保存します。
    /// </summary>
    /// <param name="log">保存対象ログです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    Task AddAsync(AuthAuditLog log, CancellationToken cancellationToken = default);
}
