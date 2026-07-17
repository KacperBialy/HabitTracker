namespace HabitTracker.Modules.Tasks.Contracts.Models;

public sealed record DayEntryDto(
    DateOnly Date,
    TaskId TaskId,
    string TaskName,
    int Minutes,
    TaskColor TaskColor);
