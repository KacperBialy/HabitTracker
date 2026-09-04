namespace HabitTracker.Modules.Tasks.Contracts.Requests;

/// <summary>
/// A manual time entry. <paramref name="FromTimer"/> is set by the frontend stopwatch when it
/// posts on stop — the backend has no notion of a running timer and cannot infer it.
/// </summary>
public sealed record LogTimeRequest(int Minutes, DateOnly LogDate, bool FromTimer = false);
