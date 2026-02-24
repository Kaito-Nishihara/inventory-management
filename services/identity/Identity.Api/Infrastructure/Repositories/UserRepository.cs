using Identity.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Identity.Api.Infrastructure.Repositories;

public class UserRepository(IdentityDbContext db) : IUserRepository
{
    private readonly IdentityDbContext _db = db;

    /// <summary>
    /// メールアドレスの存在有無を返します。
    /// </summary>
    /// <param name="normalizedEmail">正規化済みメールです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>存在する場合はtrueです。</returns>
    public Task<bool> ExistsByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default)
    {
        return _db.Users.AnyAsync(x => x.Email == normalizedEmail, cancellationToken);
    }

    /// <summary>
    /// メールアドレスでユーザーを取得します。
    /// </summary>
    /// <param name="normalizedEmail">正規化済みメールです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>ユーザー。未存在ならnullです。</returns>
    public Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default)
    {
        return _db.Users.SingleOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken);
    }

    /// <summary>
    /// ユーザーを追加して保存します。
    /// </summary>
    /// <param name="user">保存対象ユーザーです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>非同期処理です。</returns>
    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
