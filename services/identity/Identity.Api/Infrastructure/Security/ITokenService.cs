using Identity.Api.Domain;

namespace Identity.Api.Infrastructure.Security;

public interface ITokenService
{
    /// <summary>
    /// JWTを生成します。
    /// </summary>
    /// <param name="user">トークン対象ユーザーです。</param>
    /// <returns>JWT文字列です。</returns>
    string GenerateAccessToken(User user);

    /// <summary>
    /// リフレッシュトークン文字列を生成します。
    /// </summary>
    /// <returns>平文リフレッシュトークンです。</returns>
    string GenerateRefreshToken();

    /// <summary>
    /// トークンを保存用ハッシュへ変換します。
    /// </summary>
    /// <param name="token">平文トークンです。</param>
    /// <returns>SHA-256ハッシュです。</returns>
    string HashToken(string token);
}
