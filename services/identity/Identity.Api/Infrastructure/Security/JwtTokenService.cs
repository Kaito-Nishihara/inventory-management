using Identity.Api.Domain;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Identity.Api.Infrastructure.Security;

public class JwtTokenService : ITokenService
{
    /// <summary>
    /// JWTを生成します。
    /// </summary>
    /// <param name="user">トークン対象ユーザーです。</param>
    /// <returns>JWT文字列です。</returns>
    public string GenerateAccessToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSettings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// リフレッシュトークン文字列を生成します。
    /// </summary>
    /// <returns>平文リフレッシュトークンです。</returns>
    public string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    /// <summary>
    /// トークンを保存用ハッシュへ変換します。
    /// </summary>
    /// <param name="token">平文トークンです。</param>
    /// <returns>SHA-256ハッシュです。</returns>
    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }
}
