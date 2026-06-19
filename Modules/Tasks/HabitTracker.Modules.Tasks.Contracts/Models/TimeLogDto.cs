namespace HabitTracker.Modules.Tasks.Contracts.Models;

public sealed record TimeLogDto(
    TimeLogId Id,
    TaskId TaskId,
    Guid OwnerId,
    int Minutes,
    DateOnly LogDate);
