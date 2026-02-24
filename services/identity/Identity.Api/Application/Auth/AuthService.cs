using Identity.Api.Domain;
using Identity.Api.Infrastructure.Repositories;
using Identity.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Identity;

namespace Identity.Api.Application.Auth;

public class AuthService(
    IUserRepository userRepository,
    IPasswordHasher<User> passwordHasher,
    ITokenService tokenService) : IAuthService
{
    private readonly IUserRepository _userRepository = userRepository;
    private readonly IPasswordHasher<User> _passwordHasher = passwordHasher;
    private readonly ITokenService _tokenService = tokenService;

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
    /// <returns>成功時はトークン情報、失敗時はnullです。</returns>
    public async Task<LoginResult?> LoginAsync(LoginCommand command, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = User.NormalizeEmail(command.Email);
        var user = await _userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var verifyResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, command.Password);
        if (verifyResult == PasswordVerificationResult.Failed)
        {
            return null;
        }

        return new LoginResult(_tokenService.Generate(user));
    }
}
