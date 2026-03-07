using System.ComponentModel.DataAnnotations;

namespace Backend.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class NonEmptyGuidAttribute : ValidationAttribute
{
    public NonEmptyGuidAttribute()
    {
        ErrorMessage = ValidationCodes.NonEmptyGuid;
    }

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        return value is Guid guid && guid != Guid.Empty
            ? ValidationResult.Success
            : new ValidationResult(ErrorMessage);
    }
}
