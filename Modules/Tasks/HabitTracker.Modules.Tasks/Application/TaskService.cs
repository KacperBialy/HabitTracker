using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Contracts.Models;
using HabitTracker.Modules.Tasks.Contracts.Requests;
using HabitTracker.Modules.Tasks.Domain;
using HabitTracker.Modules.Tasks.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using TimeProvider = System.TimeProvider;

namespace HabitTracker.Modules.Tasks.Application;

internal sealed class TaskService(
    TasksDbContext db,
    TimeProvider clock,
    IMemoryCache cache) : ITaskService
{
    public async Task<TaskDto> Create(Guid ownerId, CreateTaskRequest request, CancellationToken ct = default)
    {
        var task = TaskItem.Register(ownerId, request.Name, request.Color, clock.GetUtcNow());
        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);

        InvalidateOwnerCache(ownerId);

        return task.ToDto();
    }

    public async Task<IReadOnlyList<TaskDto>> ListForOwner(Guid ownerId, CancellationToken ct = default)
    {
        var tasks = await cache.GetOrCreateAsync(TaskCacheKeys.TasksForOwner(ownerId), async _ =>
        {
            var entities = await db.Tasks.AsNoTracking()
                .Where(task => task.OwnerId == ownerId)
                .OrderByDescending(task => task.CreatedAt)
                .ToListAsync(ct);

            return entities.Select(entity => entity.ToDto())
                .ToList();
        });

        return tasks ?? [];
    }

    public async Task<bool> Update(Guid ownerId, TaskId id, UpdateTaskRequest request, CancellationToken ct = default)
    {
        var task = await db.Tasks.SingleOrDefaultAsync(t => t.Id == id && t.OwnerId == ownerId, ct);
        if (task is null)
            return false;

        task.Update(request.Name, request.Color);
        await db.SaveChangesAsync(ct);

        InvalidateOwnerCache(ownerId);

        return true;
    }

    public async Task<bool> Delete(Guid ownerId, TaskId id, CancellationToken ct = default)
    {
        var task = await db.Tasks.SingleOrDefaultAsync(t => t.Id == id && t.OwnerId == ownerId, ct);
        if (task is null)
            return false;

        db.Tasks.Remove(task);
        await db.SaveChangesAsync(ct);

        InvalidateOwnerCache(ownerId);

        return true;
    }

    private void InvalidateOwnerCache(Guid ownerId) 
        => cache.Remove(TaskCacheKeys.TasksForOwner(ownerId));
}
