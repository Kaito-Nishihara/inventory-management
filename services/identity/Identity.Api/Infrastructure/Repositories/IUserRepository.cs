using Identity.Api.Domain;

namespace Identity.Api.Infrastructure.Repositories;

public interface IUserRepository
{
    /// <summary>
    /// メールアドレスの存在有無を返します。
    /// </summary>
    /// <param name="normalizedEmail">正規化済みメールです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>存在する場合はtrueです。</returns>
    Task<bool> ExistsByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default);

    /// <summary>
    /// メールアドレスでユーザーを取得します。
    /// </summary>
    /// <param name="normalizedEmail">正規化済みメールです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>ユーザー。未存在ならnullです。</returns>
    Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default);

    /// <summary>
    /// IDでユーザーを取得します。
    /// </summary>
    /// <param name="userId">ユーザーIDです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>ユーザー。未存在ならnullです。</returns>
    Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ユーザーを保存します。
    /// </summary>
    /// <param name="user">保存対象ユーザーです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    Task AddAsync(User user, CancellationToken cancellationToken = default);
}
