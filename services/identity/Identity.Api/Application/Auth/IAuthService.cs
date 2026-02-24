namespace Identity.Api.Application.Auth;

public interface IAuthService
{
    Task<RegisterResult> RegisterAsync(RegisterCommand command, CancellationToken cancellationToken = default);
    Task<LoginResult?> LoginAsync(LoginCommand command, CancellationToken cancellationToken = default);
}
