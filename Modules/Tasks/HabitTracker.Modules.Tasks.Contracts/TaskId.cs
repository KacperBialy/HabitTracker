namespace HabitTracker.Modules.Tasks.Contracts;

public readonly record struct TaskId(Guid Value)
{
    public static TaskId New() => new(Guid.CreateVersion7());

    public override string ToString() => Value.ToString();
}
