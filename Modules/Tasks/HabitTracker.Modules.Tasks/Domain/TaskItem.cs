using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Contracts.Models;

namespace HabitTracker.Modules.Tasks.Domain;

internal sealed class TaskItem
{
    private TaskItem() { }

    private TaskItem(
        TaskId id,
        Guid ownerId,
        string name,
        TaskColor color,
        DateTimeOffset now,
        int position,
        TaskId? parentTaskId)
    {
        Id = id;
        OwnerId = ownerId;
        Name = name;
        Color = color;
        CreatedAt = now;
        Position = position;
        ParentTaskId = parentTaskId;
    }

    public TaskId Id { get; private set; }
    public Guid OwnerId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public TaskColor Color { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public TaskId? ParentTaskId { get; private set; }
    public int Position { get; private set; }

    public bool IsRoot => ParentTaskId is null;

    public static TaskItem Register(
        Guid ownerId,
        string name,
        TaskColor color,
        DateTimeOffset now,
        int position,
        TaskId? parentTaskId = null) =>
        new(TaskId.New(), ownerId, name, color, now, position, parentTaskId);

    public void Update(string name, TaskColor color)
    {
        Name = name;
        Color = color;
    }

    public void MoveTo(int position) => Position = position;

    public TaskDto ToDto() => new(Id, OwnerId, Name, CreatedAt, Color, Position, ParentTaskId);
}
