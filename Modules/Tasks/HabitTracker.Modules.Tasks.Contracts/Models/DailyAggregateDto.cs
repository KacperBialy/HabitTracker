namespace HabitTracker.Modules.Tasks.Contracts.Models;

public sealed record DailyAggregateDto(
    DateOnly Date,
    int TotalMinutes,
    int EntryCount);
