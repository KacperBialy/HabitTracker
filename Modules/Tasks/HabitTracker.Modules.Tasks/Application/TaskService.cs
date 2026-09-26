using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Contracts.Models;
using HabitTracker.Modules.Tasks.Contracts.Requests;
using HabitTracker.Modules.Tasks.Domain;
using HabitTracker.Modules.Tasks.Persistence;
using HabitTracker.SharedKernel.Observability;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using TimeProvider = System.TimeProvider;

namespace HabitTracker.Modules.Tasks.Application;

internal sealed class TaskService(
    TasksDbContext db,
    TimeProvider clock,
    IMemoryCache cache,
    HabitTrackerMetrics metrics) : ITaskService
{
    public async Task<TaskDto> Create(Guid ownerId, CreateTaskRequest request, CancellationToken ct = default)
    {
        var task = TaskItem.Register(ownerId, request.Name, request.Color, clock.GetUtcNow(), await TopPosition(ownerId, null, ct));
        await Persist(ownerId, task, "root", ct);
        return task.ToDto();
    }

    public async Task<TaskDto?> CreateSubtask(Guid ownerId, TaskId parentTaskId, CreateSubtaskRequest request, CancellationToken ct = default)
    {
        var parent = await db.Tasks.AsNoTracking()
            .Where(task => task.Id == parentTaskId && task.OwnerId == ownerId)
            .Select(task => new { task.ParentTaskId })
            .SingleOrDefaultAsync(ct);

        if (parent is null || parent.ParentTaskId is not null)
            return null;

        var task = TaskItem.Register(ownerId, request.Name, request.Color, clock.GetUtcNow(), await TopPosition(ownerId, parentTaskId, ct), parentTaskId);
        await Persist(ownerId, task, "subtask", ct);
        return task.ToDto();
    }

    public async Task<IReadOnlyList<TaskDto>> ListForOwner(Guid ownerId, CancellationToken ct = default)
    {
        var tasks = await cache.GetOrCreateAsync(TaskCacheKeys.TasksForOwner(ownerId), async _ =>
        {
            var entities = await db.Tasks.AsNoTracking()
                .Where(task => task.OwnerId == ownerId)
                .OrderBy(task => task.Position)
                .ThenByDescending(task => task.CreatedAt)
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

        // Count only — loading children tracked would make EF issue client-side deletes on top of the DB cascade.
        var cascadedChildren = await db.Tasks.CountAsync(child => child.ParentTaskId == id, ct);

        db.Tasks.Remove(task);
        await db.SaveChangesAsync(ct);

        InvalidateOwnerCache(ownerId);
        metrics.TaskDeleted(1 + cascadedChildren);

        return true;
    }

    public async Task<bool> Reorder(Guid ownerId, ReorderTasksRequest request, CancellationToken ct = default)
    {
        var orderedTaskIds = request.OrderedTaskIds;
        if (orderedTaskIds.Count == 0 || orderedTaskIds.Distinct().Count() != orderedTaskIds.Count)
            return false;

        var siblings = await db.Tasks
            .Where(task => task.OwnerId == ownerId && task.ParentTaskId == request.ParentTaskId)
            .ToDictionaryAsync(task => task.Id, ct);

        if (siblings.Count != orderedTaskIds.Count || !orderedTaskIds.All(siblings.ContainsKey))
            return false;

        for (var index = 0; index < orderedTaskIds.Count; index++)
            siblings[orderedTaskIds[index]].MoveTo(index);

        await db.SaveChangesAsync(ct);

        InvalidateOwnerCache(ownerId);

        return true;
    }

    private async Task<int> TopPosition(Guid ownerId, TaskId? parentTaskId, CancellationToken ct)
    {
        var lowest = await db.Tasks
            .Where(task => task.OwnerId == ownerId && task.ParentTaskId == parentTaskId)
            .MinAsync(task => (int?)task.Position, ct);

        return lowest is null
            ? 0
            : lowest.Value - 1;
    }

    private async Task Persist(Guid ownerId, TaskItem task, string kind, CancellationToken ct)
    {
        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);

        InvalidateOwnerCache(ownerId);
        metrics.TaskCreated(task.Color.ToString(), kind);
    }

    private void InvalidateOwnerCache(Guid ownerId) =>
        cache.Remove(TaskCacheKeys.TasksForOwner(ownerId));
}