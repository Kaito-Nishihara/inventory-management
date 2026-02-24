using Identity.Api.Domain;

namespace Identity.Api.Infrastructure.Security;

public interface ITokenService
{
    /// <summary>
    /// JWTを生成します。
    /// </summary>
    /// <param name="user">トークン対象ユーザーです。</param>
    /// <returns>JWT文字列です。</returns>
    string Generate(User user);
}
