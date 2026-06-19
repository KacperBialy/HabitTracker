namespace HabitTracker.Modules.Tasks.Contracts.Models;

public sealed record YearAggregatesDto(
    int Year,
    IReadOnlyList<DailyAggregateDto> Days);
