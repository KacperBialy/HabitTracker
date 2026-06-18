using System.Security.Claims;
using System.Text.Encodings.Web;
using HabitTracker.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HabitTracker.IntegrationTests.Configurations;

/// <summary>
/// Test authentication scheme that authenticates every request as a fixed user,
/// bypassing the real OIDC flow. The user id can be overridden per request via the
/// <see cref="UserIdHeader"/> header so tests can exercise per-owner data scoping.
/// </summary>
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public const string UserIdHeader = "X-Test-UserId";
    public const string AnonymousHeader = "X-Test-Anonymous";

    public static readonly Guid DefaultUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (Request.Headers.ContainsKey(AnonymousHeader))
            return Task.FromResult(AuthenticateResult.NoResult());

        var userId = Request.Headers.TryGetValue(UserIdHeader, out var values)
                     && Guid.TryParse(values.ToString(), out var parsed)
            ? parsed
            : DefaultUserId;

        var claims = new[]
        {
            new Claim(ClaimsPrincipalExtensions.UserIdClaim, userId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, "test-user"),
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
