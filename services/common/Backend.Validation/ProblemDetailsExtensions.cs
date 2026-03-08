using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;

namespace Backend.Validation;

public static class ProblemDetailsExtensions
{
    public static ObjectResult ToProblem(this ControllerBase controller, int statusCode, string code, string? detail = null, string? title = null)
    {
        var payload = new ProblemDetails
        {
            Status = statusCode,
            Title = title ?? ReasonPhrases.GetReasonPhrase(statusCode),
            Detail = detail,
            Type = $"https://httpstatuses.com/{statusCode}"
        };
        payload.Extensions["code"] = code;
        return new ObjectResult(payload)
        {
            StatusCode = statusCode
        };
    }
}
