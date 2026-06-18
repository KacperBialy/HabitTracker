using System.Security.Claims;
using HabitTracker.Modules.Users.Contracts;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HabitTracker.Authentication;

public static class DependencyInjection
{
    public static IServiceCollection AddOidcAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var oidc = configuration.GetSection(OidcOptions.SectionName).Get<OidcOptions>()
                   ?? throw new InvalidOperationException(
                       $"Missing '{OidcOptions.SectionName}' configuration section.");

        services.AddAuthentication(options =>
            {
                options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
            })
            .AddCookie()
            .AddOpenIdConnect(options =>
            {
                options.Authority = oidc.Authority;
                options.ClientId = oidc.ClientId;
                options.ClientSecret = oidc.ClientSecret;
                options.ResponseType = "code";

                options.Scope.Clear();
                options.Scope.Add("openid");
                options.Scope.Add("profile");
                options.Scope.Add("email");

                options.SaveTokens = false;
                options.GetClaimsFromUserInfoEndpoint = true;

                options.Events.OnTokenValidated = async context =>
                {
                    var principal = context.Principal
                        ?? throw new InvalidOperationException("No principal on validated token.");

                    var request = MapToCreateUserRequest(principal);

                    var users = context.HttpContext.RequestServices.GetRequiredService<IUserService>();
                    var user = await users.Create(request, context.HttpContext.RequestAborted);

                    // Carry the internal UserId on the cookie so downstream modules can scope data
                    // by owner without a per-request lookup.
                    ((ClaimsIdentity)principal.Identity!).AddClaim(new Claim("uid", user.Id.ToString()));
                };
            });

        services.AddAuthorization();

        return services;
    }

    private static CreateUserRequest MapToCreateUserRequest(ClaimsPrincipal principal)
    {
        var subject = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? throw new InvalidOperationException("OIDC token is missing the 'sub' claim.");
        var email = principal.FindFirstValue(ClaimTypes.Email)
                    ?? throw new InvalidOperationException("OIDC token is missing the 'email' claim.");
        var displayName = principal.FindFirstValue(ClaimTypes.Name) ?? email;

        return new CreateUserRequest(subject, email, displayName);
    }
}
