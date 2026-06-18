using HabitTracker.Infrastructure;
using HabitTracker.Modules.Tasks.Contracts;

namespace HabitTracker.Endpoints;

public static class TaskEndpoints
{
    public static IEndpointRouteBuilder MapTaskEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/tasks").RequireAuthorization();

        group.MapPost("/", async (CreateTaskRequest request, ITaskService tasks, HttpContext http, CancellationToken ct) =>
        {
            var dto = await tasks.Create(http.User.GetUserId(), request, ct);
            return Results.Created($"/api/tasks/{dto.Id}", dto);
        });

        group.MapGet("/", async (ITaskService tasks, HttpContext http, CancellationToken ct) =>
            Results.Ok(await tasks.ListForOwner(http.User.GetUserId(), ct)));

        group.MapPut("/{id:guid}", async (Guid id, RenameTaskRequest request, ITaskService tasks, HttpContext http, CancellationToken ct) =>
        {
            var renamed = await tasks.Rename(http.User.GetUserId(), new TaskId(id), request, ct);
            return renamed ? Results.NoContent() : Results.NotFound();
        });

        group.MapDelete("/{id:guid}", async (Guid id, ITaskService tasks, HttpContext http, CancellationToken ct) =>
        {
            var deleted = await tasks.Delete(http.User.GetUserId(), new TaskId(id), ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        return endpoints;
    }
}
