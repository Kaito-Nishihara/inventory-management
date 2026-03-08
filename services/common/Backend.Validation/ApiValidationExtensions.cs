using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Validation;

public static class ApiValidationExtensions
{
    public static IServiceCollection AddUnifiedApiValidation(this IServiceCollection services)
    {
        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var payload = new ValidationProblemDetails(ToErrors(context.ModelState))
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "One or more validation errors occurred.",
                    Type = "https://httpstatuses.com/400"
                };
                payload.Extensions["code"] = ApiErrorCodes.ValidationError;
                return new BadRequestObjectResult(payload);
            };
        });

        return services;
    }

    private static Dictionary<string, string[]> ToErrors(ModelStateDictionary modelState)
    {
        return modelState
            .Where(x => x.Value?.Errors.Count > 0)
            .GroupBy(x => string.IsNullOrWhiteSpace(x.Key) ? "request" : x.Key)
            .ToDictionary(
                x => x.Key,
                x => x.SelectMany(y => y.Value!.Errors)
                    .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Invalid value." : e.ErrorMessage)
                    .Distinct()
                    .ToArray());
    }
}
