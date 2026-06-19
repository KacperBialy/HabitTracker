namespace HabitTracker.Modules.Tasks.Contracts;

public readonly record struct TimeLogId(Guid Value)
{
    public static TimeLogId New() => new(Guid.CreateVersion7());

    public override string ToString() => Value.ToString();
}
