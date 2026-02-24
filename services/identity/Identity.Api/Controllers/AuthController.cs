using Identity.Api.Application.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Identity.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    private readonly IAuthService _authService = authService;

    [HttpPost("register")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterAsync(
            new RegisterCommand(request.Email, request.Password),
            cancellationToken);

        if (result.Status == RegisterStatus.Conflict)
        {
            return Conflict("Email already exists");
        }

        return CreatedAtAction(nameof(Register), new { userId = result.UserId }, null);
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(
            new LoginCommand(request.Email, request.Password),
            cancellationToken);

        if (result is null)
        {
            return Unauthorized();
        }

        return Ok(new LoginResponse(result.Token));
    }
}

public record RegisterRequest(string Email, string Password);
public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token);
