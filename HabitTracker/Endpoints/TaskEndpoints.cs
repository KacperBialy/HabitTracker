using HabitTracker.Infrastructure;
using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Contracts.Requests;

namespace HabitTracker.Endpoints;

public static class TaskEndpoints
{
    public static IEndpointRouteBuilder MapTaskEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/tasks")
            .RequireAuthorization();

        group.MapPost("/", async (CreateTaskRequest request, ITaskService tasks, HttpContext http, CancellationToken ct) =>
        {
            var dto = await tasks.Create(http.User.GetUserId(), request, ct);
            return Results.Created($"/api/tasks/{dto.Id}", dto);
        });

        group.MapGet("/", async (ITaskService tasks, HttpContext http, CancellationToken ct) =>
            Results.Ok(await tasks.ListForOwner(http.User.GetUserId(), ct)));

        group.MapPut("/{id:guid}", async (Guid id, UpdateTaskRequest request, ITaskService tasks, HttpContext http, CancellationToken ct) =>
        {
            var updated = await tasks.Update(http.User.GetUserId(), new TaskId(id), request, ct);
            return updated ? Results.NoContent() : Results.NotFound();
        });

        group.MapDelete("/{id:guid}", async (Guid id, ITaskService tasks, HttpContext http, CancellationToken ct) =>
        {
            var deleted = await tasks.Delete(http.User.GetUserId(), new TaskId(id), ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        group.MapPost("/{taskId:guid}/timelogs", async (Guid taskId, LogTimeRequest request, ITaskTimeLogService timeLogs, HttpContext http, CancellationToken ct) =>
        {
            var dto = await timeLogs.LogTime(http.User.GetUserId(), new TaskId(taskId), request, ct);
            return dto is null
                ? Results.NotFound()
                : Results.Created($"/api/tasks/{taskId}/timelogs/{dto.Id}", dto);
        });

        group.MapGet("/{taskId:guid}/timelogs", async (Guid taskId, ITaskTimeLogService timeLogs, HttpContext http, CancellationToken ct) =>
            Results.Ok(await timeLogs.ListTimeLogs(http.User.GetUserId(), new TaskId(taskId), ct)));

        group.MapGet("/timelogs/aggregates", async (int? year, ITaskTimeLogService timeLogs, HttpContext http, CancellationToken ct) =>
            Results.Ok(await timeLogs.GetYearAggregates(http.User.GetUserId(), year, ct)));

        group.MapGet("/timelogs/aggregates/{date}", async (DateOnly date, ITaskTimeLogService timeLogs, HttpContext http, CancellationToken ct) =>
            Results.Ok(await timeLogs.GetDayEntries(http.User.GetUserId(), date, ct)));

        group.MapDelete("/{taskId:guid}/timelogs/{logId:guid}", async (Guid taskId, Guid logId, ITaskTimeLogService timeLogs, HttpContext http, CancellationToken ct) =>
        {
            var deleted = await timeLogs.DeleteTimeLog(http.User.GetUserId(), new TaskId(taskId), new TimeLogId(logId), ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        return endpoints;
    }
}