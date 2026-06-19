namespace HabitTracker.Modules.Tasks.Contracts;

public sealed record TimeLogDto(
    TimeLogId Id,
    TaskId TaskId,
    Guid OwnerId,
    int Minutes,
    DateOnly LogDate);
