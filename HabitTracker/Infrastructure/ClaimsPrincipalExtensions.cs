using System.Security.Claims;

namespace HabitTracker.Infrastructure;

public static class ClaimsPrincipalExtensions
{
    public const string UserIdClaim = "uid";

    public static Guid GetUserId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(UserIdClaim), out var id)
            ? id
            : throw new InvalidOperationException($"Missing or invalid '{UserIdClaim}' claim.");
}
