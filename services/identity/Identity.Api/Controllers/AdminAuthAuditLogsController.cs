using Identity.Api.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Identity.Api.Controllers;

[ApiController]
[Route("admin/auth-audit-logs")]
[Authorize(Roles = "admin")]
public class AdminAuthAuditLogsController(IAuthAuditLogRepository authAuditLogRepository) : ControllerBase
{
    private readonly IAuthAuditLogRepository _authAuditLogRepository = authAuditLogRepository;

    /// <summary>
    /// 認証監査ログを新しい順に取得します。
    /// </summary>
    /// <param name="take">取得件数です。</param>
    /// <param name="fromUtc">取得開始日時(UTC)です。</param>
    /// <param name="toUtc">取得終了日時(UTC)です。</param>
    /// <param name="cancellationToken">キャンセル用トークンです。</param>
    /// <returns>監査ログ一覧です。</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AuthAuditLogResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] int take = 50,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null,
        CancellationToken cancellationToken = default)
    {
        var rows = await _authAuditLogRepository.ListAsync(take, fromUtc, toUtc, cancellationToken);
        return Ok(rows.Select(x => new AuthAuditLogResponse(
            x.Id,
            x.UserId,
            x.Action,
            x.Success,
            x.Detail,
            x.CreatedAtUtc)).ToList());
    }
}

public sealed record AuthAuditLogResponse(
    Guid Id,
    Guid? UserId,
    string Action,
    bool Success,
    string? Detail,
    DateTime CreatedAtUtc);
