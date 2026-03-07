using Identity.Api.Application.Auth;
using Backend.Validation;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace Identity.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    private readonly IAuthService _authService = authService;

    /// <summary>
    /// ユーザーを登録します。
    /// </summary>
    /// <param name="request">登録リクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>作成結果です。</returns>
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

    /// <summary>
    /// ログインしてJWTを返します。
    /// </summary>
    /// <param name="request">ログインリクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>認証結果です。</returns>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthTokensResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthTokensResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(
            new LoginCommand(request.Email, request.Password),
            cancellationToken);

        if (result is null)
        {
            return Unauthorized();
        }

        return Ok(new AuthTokensResponse(result.AccessToken, result.RefreshToken));
    }

    /// <summary>
    /// リフレッシュトークンで再発行します。
    /// </summary>
    /// <param name="request">再発行リクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>再発行結果です。</returns>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthTokensResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthTokensResponse>> Refresh([FromBody] RefreshRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.RefreshAsync(new RefreshCommand(request.RefreshToken), cancellationToken);
        if (result is null)
        {
            return Unauthorized();
        }

        return Ok(new AuthTokensResponse(result.AccessToken, result.RefreshToken));
    }

    /// <summary>
    /// リフレッシュトークンを失効します。
    /// </summary>
    /// <param name="request">失効リクエストです。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>失効結果です。</returns>
    [HttpPost("revoke")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Revoke([FromBody] RevokeRequest request, CancellationToken cancellationToken)
    {
        var success = await _authService.RevokeAsync(new RevokeCommand(request.RefreshToken), cancellationToken);
        if (!success)
        {
            return Unauthorized();
        }

        return NoContent();
    }
}

public record RegisterRequest(
    [Required(ErrorMessage = ValidationCodes.Required), EmailAddress(ErrorMessage = ValidationCodes.Email), StringLength(200, ErrorMessage = ValidationCodes.StringLength)] string Email,
    [Required(ErrorMessage = ValidationCodes.Required), StringLength(100, MinimumLength = 8, ErrorMessage = ValidationCodes.StringLength)] string Password);
public record LoginRequest(
    [Required(ErrorMessage = ValidationCodes.Required), StringLength(200, ErrorMessage = ValidationCodes.StringLength)] string Email,
    [Required(ErrorMessage = ValidationCodes.Required), StringLength(100, ErrorMessage = ValidationCodes.StringLength)] string Password);
public record RefreshRequest(
    [Required(ErrorMessage = ValidationCodes.Required), StringLength(500, MinimumLength = 20, ErrorMessage = ValidationCodes.StringLength)] string RefreshToken);
public record RevokeRequest(
    [Required(ErrorMessage = ValidationCodes.Required), StringLength(500, MinimumLength = 20, ErrorMessage = ValidationCodes.StringLength)] string RefreshToken);
public record AuthTokensResponse(string AccessToken, string RefreshToken);
