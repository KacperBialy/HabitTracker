using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Contracts.Models;
using HabitTracker.Modules.Tasks.Contracts.Requests;
using HabitTracker.Modules.Tasks.Domain;
using HabitTracker.Modules.Tasks.Persistence;
using Microsoft.EntityFrameworkCore;
using TimeProvider = System.TimeProvider;

namespace HabitTracker.Modules.Tasks.Application;

internal sealed class TaskService(
    TasksDbContext db,
    TimeProvider clock) : ITaskService
{
    public async Task<TaskDto> Create(Guid ownerId, CreateTaskRequest request, CancellationToken ct = default)
    {
        var task = TaskItem.Register(ownerId, request.Name, request.Color, clock.GetUtcNow());
        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);
        return task.ToDto();
    }

    public async Task<IReadOnlyList<TaskDto>> ListForOwner(Guid ownerId, CancellationToken ct = default)
    {
        var tasks = await db.Tasks.AsNoTracking()
            .Where(t => t.OwnerId == ownerId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);
        return tasks.Select(t => t.ToDto()).ToList();
    }

    public async Task<bool> Rename(Guid ownerId, TaskId id, RenameTaskRequest request, CancellationToken ct = default)
    {
        var task = await db.Tasks.SingleOrDefaultAsync(t => t.Id == id && t.OwnerId == ownerId, ct);
        if (task is null)
            return false;

        task.Rename(request.Name);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> Delete(Guid ownerId, TaskId id, CancellationToken ct = default)
    {
        var task = await db.Tasks.SingleOrDefaultAsync(t => t.Id == id && t.OwnerId == ownerId, ct);
        if (task is null)
            return false;

        db.Tasks.Remove(task);
        await db.SaveChangesAsync(ct);

        return true;
    }
}
