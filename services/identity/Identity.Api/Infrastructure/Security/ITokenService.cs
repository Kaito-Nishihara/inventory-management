using Identity.Api.Domain;

namespace Identity.Api.Infrastructure.Security;

public interface ITokenService
{
    string Generate(User user);
}
