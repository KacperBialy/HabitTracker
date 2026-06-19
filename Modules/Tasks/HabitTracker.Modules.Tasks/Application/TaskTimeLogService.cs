using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Domain;
using HabitTracker.Modules.Tasks.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Modules.Tasks.Application;

internal sealed class TaskTimeLogService(TasksDbContext db) : ITaskTimeLogService
{
    public async Task<TimeLogDto?> LogTime(Guid ownerId, TaskId taskId, LogTimeRequest request, CancellationToken ct = default)
    {
        if (request.Minutes is <= 0 or > TimeLogEntry.MaxMinutes)
            return null;

        var ownsTask = await db.Tasks.AnyAsync(t => t.Id == taskId && t.OwnerId == ownerId, ct);
        if (!ownsTask)
            return null;

        var entry = TimeLogEntry.Log(taskId, ownerId, request.Minutes, request.LogDate);
        db.TimeLogs.Add(entry);
        await db.SaveChangesAsync(ct);
        return entry.ToDto();
    }

    public async Task<IReadOnlyList<TimeLogDto>> ListTimeLogs(Guid ownerId, TaskId taskId, CancellationToken ct = default)
    {
        var logs = await db.TimeLogs.AsNoTracking()
            .Where(l => l.TaskId == taskId && l.OwnerId == ownerId)
            .OrderByDescending(l => l.LogDate)
            .ThenByDescending(l => l.Id)
            .ToListAsync(ct);
        return logs.Select(l => l.ToDto()).ToList();
    }

    public async Task<bool> DeleteTimeLog(Guid ownerId, TaskId taskId, TimeLogId id, CancellationToken ct = default)
    {
        var entry = await db.TimeLogs.SingleOrDefaultAsync(
            l => l.Id == id && l.TaskId == taskId && l.OwnerId == ownerId, ct);
        if (entry is null)
            return false;

        db.TimeLogs.Remove(entry);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
