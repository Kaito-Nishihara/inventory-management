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

    /// <summary>
    /// 認証監査ログを新しい順に取得します。
    /// </summary>
    /// <param name="take">取得件数です。</param>
    /// <param name="fromUtc">取得開始日時(UTC)です。</param>
    /// <param name="toUtc">取得終了日時(UTC)です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>監査ログ一覧です。</returns>
    Task<IReadOnlyList<AuthAuditLog>> ListAsync(
        int take = 50,
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        CancellationToken cancellationToken = default);
}
