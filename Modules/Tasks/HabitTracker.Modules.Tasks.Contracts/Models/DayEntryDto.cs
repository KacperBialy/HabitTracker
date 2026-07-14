namespace HabitTracker.Modules.Tasks.Contracts.Models;

public sealed record DayEntryDto(
    TaskId TaskId,
    string TaskName,
    int Minutes,
    TaskColor TaskColor);
