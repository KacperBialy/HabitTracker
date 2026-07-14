using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Contracts.Models;

namespace HabitTracker.Modules.Tasks.Domain;

internal sealed class TaskItem
{
    private TaskItem() { }

    private TaskItem(TaskId id, Guid ownerId, string name, TaskColor color, DateTimeOffset now)
    {
        Id = id;
        OwnerId = ownerId;
        Name = name;
        Color = color;
        CreatedAt = now;
    }

    public TaskId Id { get; private set; }
    public Guid OwnerId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public TaskColor Color { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static TaskItem Register(Guid ownerId, string name, TaskColor color, DateTimeOffset now) =>
        new(TaskId.New(), ownerId, name, color, now);

    public void Rename(string name) => Name = name;

    public TaskDto ToDto() => new(Id, OwnerId, Name, CreatedAt, Color);
}
