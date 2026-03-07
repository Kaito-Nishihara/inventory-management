using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
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
                return new BadRequestObjectResult(new ValidationErrorResponse(
                    "validation_error",
                    ToErrors(context.ModelState)));
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

public sealed record ValidationErrorResponse(string Code, IReadOnlyDictionary<string, string[]> Errors);
