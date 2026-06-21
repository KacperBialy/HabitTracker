using HabitTracker.Infrastructure;

namespace HabitTracker.Endpoints;

public static class MeEndpoints
{
    public static IEndpointRouteBuilder MapMeEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/me", (HttpContext http) =>
            Results.Ok(new { id = http.User.GetUserId() }))
            .RequireAuthorization();

        return endpoints;
    }
}
