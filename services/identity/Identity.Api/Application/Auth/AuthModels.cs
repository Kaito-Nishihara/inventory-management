namespace Identity.Api.Application.Auth;

public sealed record RegisterCommand(string Email, string Password);
public sealed record LoginCommand(string Email, string Password);
public sealed record RefreshCommand(string RefreshToken);
public sealed record RevokeCommand(string RefreshToken);
public sealed record AuthTokensResult(string AccessToken, string RefreshToken);

public enum RegisterStatus
{
    Created,
    Conflict
}

public sealed record RegisterResult(RegisterStatus Status, Guid? UserId = null);
