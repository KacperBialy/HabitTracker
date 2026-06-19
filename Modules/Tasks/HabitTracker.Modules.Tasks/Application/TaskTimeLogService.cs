using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Contracts.Models;
using HabitTracker.Modules.Tasks.Contracts.Requests;
using HabitTracker.Modules.Tasks.Domain;
using HabitTracker.Modules.Tasks.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Modules.Tasks.Application;

internal sealed class TaskTimeLogService(TasksDbContext db, TimeProvider clock) : ITaskTimeLogService
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
            .Where(log => log.TaskId == taskId && log.OwnerId == ownerId)
            .OrderByDescending(log => log.LogDate)
            .ThenByDescending(log => log.Id)
            .ToListAsync(ct);
        return logs.Select(log => log.ToDto()).ToList();
    }

    public async Task<bool> DeleteTimeLog(Guid ownerId, TaskId taskId, TimeLogId id, CancellationToken ct = default)
    {
        var entry = await db.TimeLogs.SingleOrDefaultAsync(
            log => log.Id == id && log.TaskId == taskId && log.OwnerId == ownerId, ct);
        if (entry is null)
            return false;

        db.TimeLogs.Remove(entry);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<YearAggregatesDto> GetYearAggregates(Guid ownerId, int? year, CancellationToken ct = default)
    {
        var targetYear = year ?? clock.GetUtcNow().Year;
        var from = new DateOnly(targetYear, 1, 1);
        var to = new DateOnly(targetYear, 12, 31);

        var rows = await db.TimeLogs.AsNoTracking()
            .Where(log => log.OwnerId == ownerId && log.LogDate >= from && log.LogDate <= to)
            .GroupBy(log => log.LogDate)
            .Select(group => new { Date = group.Key, TotalMinutes = group.Sum(log => log.Minutes), EntryCount = group.Count() })
            .OrderBy(row => row.Date)
            .ToListAsync(ct);

        var days = rows.Select(row => new DailyAggregateDto(row.Date, row.TotalMinutes, row.EntryCount)).ToList();
        return new YearAggregatesDto(targetYear, days);
    }

    public async Task<IReadOnlyList<DayEntryDto>> GetDayEntries(Guid ownerId, DateOnly date, CancellationToken ct = default)
    {
        var query =
            from log in db.TimeLogs.AsNoTracking()
            where log.OwnerId == ownerId && log.LogDate == date
            from task in db.Tasks.Where(task => task.Id == log.TaskId)
            orderby log.Minutes descending
            select new DayEntryDto(log.TaskId, task.Name, log.Minutes);

        return await query.ToListAsync(ct);
    }
}
