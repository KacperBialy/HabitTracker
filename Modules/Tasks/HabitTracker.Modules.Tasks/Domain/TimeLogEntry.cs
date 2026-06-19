using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Contracts.Models;

namespace HabitTracker.Modules.Tasks.Domain;

internal sealed class TimeLogEntry
{
    public const int MaxMinutes = 1440;

    private TimeLogEntry() { }

    private TimeLogEntry(TimeLogId id, TaskId taskId, Guid ownerId, int minutes, DateOnly logDate)
    {
        Id = id;
        TaskId = taskId;
        OwnerId = ownerId;
        Minutes = minutes;
        LogDate = logDate;
    }

    public TimeLogId Id { get; private set; }
    public TaskId TaskId { get; private set; }
    public Guid OwnerId { get; private set; }
    public int Minutes { get; private set; }
    public DateOnly LogDate { get; private set; }

    public static TimeLogEntry Log(TaskId taskId, Guid ownerId, int minutes, DateOnly logDate)
    {
        if (minutes is <= 0 or > MaxMinutes)
            throw new ArgumentOutOfRangeException(nameof(minutes), minutes, $"Minutes must be between 1 and {MaxMinutes}.");

        return new TimeLogEntry(TimeLogId.New(), taskId, ownerId, minutes, logDate);
    }

    public TimeLogDto ToDto() => new(Id, TaskId, OwnerId, Minutes, LogDate);
}
