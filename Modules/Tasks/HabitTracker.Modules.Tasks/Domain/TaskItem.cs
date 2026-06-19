using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Contracts.Models;

namespace HabitTracker.Modules.Tasks.Domain;

internal sealed class TaskItem
{
    private TaskItem() { }

    private TaskItem(TaskId id, Guid ownerId, string name, DateTimeOffset now)
    {
        Id = id;
        OwnerId = ownerId;
        Name = name;
        CreatedAt = now;
    }

    public TaskId Id { get; private set; }
    public Guid OwnerId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; private set; }

    public static TaskItem Register(Guid ownerId, string name, DateTimeOffset now) =>
        new(TaskId.New(), ownerId, name, now);

    public void Rename(string name) => Name = name;

    public TaskDto ToDto() => new(Id, OwnerId, Name, CreatedAt);
}
