namespace HabitTracker.Modules.Tasks.Contracts;

public sealed record TaskDto(
    TaskId Id,
    Guid OwnerId,
    string Name,
    DateTimeOffset CreatedAt);
