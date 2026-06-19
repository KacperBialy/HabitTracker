namespace HabitTracker.Modules.Tasks.Contracts.Requests;

public sealed record LogTimeRequest(int Minutes, DateOnly LogDate);
