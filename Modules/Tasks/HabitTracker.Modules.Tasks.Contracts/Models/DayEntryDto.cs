namespace HabitTracker.Modules.Tasks.Contracts.Models;

public sealed record DayEntryDto(
    TimeLogId Id,
    DateOnly Date,
    TaskId TaskId,
    string TaskName,
    int Minutes,
    TaskColor TaskColor);
