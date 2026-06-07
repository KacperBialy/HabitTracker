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
            });

        services.AddAuthorization();

        return services;
    }
}
