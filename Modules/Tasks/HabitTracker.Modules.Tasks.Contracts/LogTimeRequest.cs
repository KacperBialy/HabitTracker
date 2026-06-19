namespace HabitTracker.Modules.Tasks.Contracts;

public sealed record LogTimeRequest(int Minutes, DateOnly LogDate);
