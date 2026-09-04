using System.Diagnostics.Metrics;

namespace HabitTracker.SharedKernel.Observability;

/// <summary>
/// Business telemetry for HabitTracker — counters that follow domain operations, not HTTP calls.
/// The Prometheus exporter renames these to <c>habittracker_tasks_created_total</c> and friends.
/// </summary>
public sealed class HabitTrackerMetrics
{
    public const string MeterName = "HabitTracker";

    private readonly Counter<long> _tasksCreated;
    private readonly Counter<long> _tasksDeleted;
    private readonly Counter<long> _timeLogsCreated;
    private readonly Counter<long> _trackedMinutes;
    private readonly Counter<long> _timerSessions;

    public HabitTrackerMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(MeterName);

        _tasksCreated = meter.CreateCounter<long>(
            "habittracker.tasks.created", unit: "{task}", description: "Tasks created.");
        _tasksDeleted = meter.CreateCounter<long>(
            "habittracker.tasks.deleted", unit: "{task}", description: "Tasks deleted.");
        _timeLogsCreated = meter.CreateCounter<long>(
            "habittracker.time_logs.created", unit: "{entry}", description: "Time log entries created.");
        _trackedMinutes = meter.CreateCounter<long>(
            "habittracker.tracked.minutes", unit: "min", description: "Total minutes logged against tasks.");
        _timerSessions = meter.CreateCounter<long>(
            "habittracker.timer.sessions", unit: "{session}", description: "Time entries by how they were recorded.");
    }

    public void TaskCreated(string colorName)
        => _tasksCreated.Add(1, new KeyValuePair<string, object?>("color", colorName));

    public void TaskDeleted() => _tasksDeleted.Add(1);

    public void TimeLogged(int minutes, bool fromTimer)
    {
        _timeLogsCreated.Add(1);
        _trackedMinutes.Add(minutes);
        _timerSessions.Add(1, new KeyValuePair<string, object?>("source", fromTimer ? "timer" : "manual"));
    }
}
