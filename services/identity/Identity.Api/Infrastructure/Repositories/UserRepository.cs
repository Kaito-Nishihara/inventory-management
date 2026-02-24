using Identity.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Identity.Api.Infrastructure.Repositories;

public class UserRepository(IdentityDbContext db) : IUserRepository
{
    private readonly IdentityDbContext _db = db;

    public Task<bool> ExistsByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default)
    {
        return _db.Users.AnyAsync(x => x.Email == normalizedEmail, cancellationToken);
    }

    public Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default)
    {
        return _db.Users.SingleOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
