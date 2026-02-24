using Identity.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Identity.Api.Infrastructure;

public static class IdentitySeed
{
    /// <summary>
    /// 既定ユーザーを投入します。
    /// </summary>
    /// <param name="db">DBコンテキストです。</param>
    /// <param name="passwordHasher">パスワードハッシャーです。</param>
    /// <returns>非同期処理です。</returns>
    public static async Task SeedDefaultsAsync(IdentityDbContext db, IPasswordHasher<User> passwordHasher)
    {
        await SeedUserIfNotExistsAsync(db, passwordHasher, "admin@test.com", "password", "admin");
        await SeedUserIfNotExistsAsync(db, passwordHasher, "user@test.com", "password", "user");
    }

    /// <summary>
    /// 指定ユーザーが未存在なら作成します。
    /// </summary>
    /// <param name="db">DBコンテキストです。</param>
    /// <param name="passwordHasher">パスワードハッシャーです。</param>
    /// <param name="email">メールアドレスです。</param>
    /// <param name="password">平文パスワードです。</param>
    /// <param name="role">ロールです。</param>
    /// <returns>非同期処理です。</returns>
    private static async Task SeedUserIfNotExistsAsync(
        IdentityDbContext db,
        IPasswordHasher<User> passwordHasher,
        string email,
        string password,
        string role)
    {
        var normalizedEmail = User.NormalizeEmail(email);
        var exists = await db.Users.AnyAsync(x => x.Email == normalizedEmail);
        if (exists)
        {
            return;
        }

        var user = User.Create(normalizedEmail, role);
        user.SetPasswordHash(passwordHasher.HashPassword(user, password));
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }
}
