namespace Identity.Api.Domain;

public class User
{
    public Guid Id { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string Role { get; private set; } = "user";
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;

    public static User Create(string email, string role = "user")
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = NormalizeEmail(email),
            Role = role,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    public void SetPasswordHash(string passwordHash)
    {
        PasswordHash = passwordHash;
    }
}
