namespace HabitTracker.Modules.Tasks.Contracts.Models;

public sealed record TaskDto(
    TaskId Id,
    Guid OwnerId,
    string Name,
    DateTimeOffset CreatedAt);
