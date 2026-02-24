namespace Identity.Api.Application.Auth;

public sealed record RegisterCommand(string Email, string Password);
public sealed record LoginCommand(string Email, string Password);
public sealed record LoginResult(string Token);

public enum RegisterStatus
{
    Created,
    Conflict
}

public sealed record RegisterResult(RegisterStatus Status, Guid? UserId = null);
