using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace HabitTracker.Authentication.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/login", () => Results.Challenge(
            new AuthenticationProperties { RedirectUri = "/" },
            [OpenIdConnectDefaults.AuthenticationScheme]));

        endpoints.MapGet("/logout", () => Results.SignOut(
            new AuthenticationProperties { RedirectUri = "/" },
            [
                CookieAuthenticationDefaults.AuthenticationScheme,
                OpenIdConnectDefaults.AuthenticationScheme
            ]));

        return endpoints;
    }
}
