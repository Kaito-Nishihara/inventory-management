using Identity.Api.Domain;
using Identity.Api.Infrastructure.Repositories;
using Identity.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Identity;

namespace Identity.Api.Application.Auth;

public class AuthService(
    IUserRepository userRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IAuthAuditLogRepository auditLogRepository,
    IPasswordHasher<User> passwordHasher,
    ITokenService tokenService) : IAuthService
{
    private readonly IUserRepository _userRepository = userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository = refreshTokenRepository;
    private readonly IAuthAuditLogRepository _auditLogRepository = auditLogRepository;
    private readonly IPasswordHasher<User> _passwordHasher = passwordHasher;
    private readonly ITokenService _tokenService = tokenService;
    private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(7);

    /// <summary>
    /// 新規ユーザーを作成します。
    /// </summary>
    /// <param name="command">登録情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>登録結果です。</returns>
    public async Task<RegisterResult> RegisterAsync(RegisterCommand command, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = User.NormalizeEmail(command.Email);
        var exists = await _userRepository.ExistsByEmailAsync(normalizedEmail, cancellationToken);
        if (exists)
        {
            return new RegisterResult(RegisterStatus.Conflict);
        }

        var user = User.Create(normalizedEmail, "user");
        user.SetPasswordHash(_passwordHasher.HashPassword(user, command.Password));

        await _userRepository.AddAsync(user, cancellationToken);
        return new RegisterResult(RegisterStatus.Created, user.Id);
    }

    /// <summary>
    /// 認証し、成功時にJWTを返します。
    /// </summary>
    /// <param name="command">ログイン情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>成功時はアクセストークン/リフレッシュトークン、失敗時はnullです。</returns>
    public async Task<AuthTokensResult?> LoginAsync(LoginCommand command, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = User.NormalizeEmail(command.Email);
        var user = await _userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user is null)
        {
            await _auditLogRepository.AddAsync(AuthAuditLog.Create("login", false, null, "user_not_found"), cancellationToken);
            return null;
        }

        var verifyResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, command.Password);
        if (verifyResult == PasswordVerificationResult.Failed)
        {
            await _auditLogRepository.AddAsync(AuthAuditLog.Create("login", false, user.Id, "invalid_password"), cancellationToken);
            return null;
        }

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var refreshTokenHash = _tokenService.HashToken(refreshToken);
        var tokenEntity = RefreshToken.Create(user.Id, refreshTokenHash, DateTime.UtcNow.Add(RefreshTokenLifetime));
        await _refreshTokenRepository.AddAsync(tokenEntity, cancellationToken);
        await _auditLogRepository.AddAsync(AuthAuditLog.Create("login", true, user.Id), cancellationToken);

        return new AuthTokensResult(accessToken, refreshToken);
    }

    /// <summary>
    /// リフレッシュトークンで再発行します。
    /// </summary>
    /// <param name="command">再発行情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>成功時は新しいアクセストークン/リフレッシュトークン、失敗時はnullです。</returns>
    public async Task<AuthTokensResult?> RefreshAsync(RefreshCommand command, CancellationToken cancellationToken = default)
    {
        var tokenHash = _tokenService.HashToken(command.RefreshToken);
        var refreshToken = await _refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);
        if (refreshToken is null || !refreshToken.IsActive(DateTime.UtcNow))
        {
            await _auditLogRepository.AddAsync(AuthAuditLog.Create("refresh", false, null, "invalid_or_expired_refresh_token"), cancellationToken);
            return null;
        }

        var user = await _userRepository.GetByIdAsync(refreshToken.UserId, cancellationToken);
        if (user is null)
        {
            await _auditLogRepository.AddAsync(AuthAuditLog.Create("refresh", false, null, "user_not_found"), cancellationToken);
            return null;
        }

        var newRefreshToken = _tokenService.GenerateRefreshToken();
        var newRefreshTokenHash = _tokenService.HashToken(newRefreshToken);
        refreshToken.Revoke(DateTime.UtcNow, newRefreshTokenHash);
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);

        var newTokenEntity = RefreshToken.Create(user.Id, newRefreshTokenHash, DateTime.UtcNow.Add(RefreshTokenLifetime));
        await _refreshTokenRepository.AddAsync(newTokenEntity, cancellationToken);

        var newAccessToken = _tokenService.GenerateAccessToken(user);
        await _auditLogRepository.AddAsync(AuthAuditLog.Create("refresh", true, user.Id), cancellationToken);
        return new AuthTokensResult(newAccessToken, newRefreshToken);
    }

    /// <summary>
    /// リフレッシュトークンを失効します。
    /// </summary>
    /// <param name="command">失効情報です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>失効できた場合はtrueです。</returns>
    public async Task<bool> RevokeAsync(RevokeCommand command, CancellationToken cancellationToken = default)
    {
        var tokenHash = _tokenService.HashToken(command.RefreshToken);
        var refreshToken = await _refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);
        if (refreshToken is null || !refreshToken.IsActive(DateTime.UtcNow))
        {
            await _auditLogRepository.AddAsync(AuthAuditLog.Create("revoke", false, null, "invalid_or_expired_refresh_token"), cancellationToken);
            return false;
        }

        refreshToken.Revoke(DateTime.UtcNow);
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);
        await _auditLogRepository.AddAsync(AuthAuditLog.Create("revoke", true, refreshToken.UserId), cancellationToken);
        return true;
    }
}
