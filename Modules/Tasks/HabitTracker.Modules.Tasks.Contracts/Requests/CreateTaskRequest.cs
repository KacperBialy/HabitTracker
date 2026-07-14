using HabitTracker.Modules.Tasks.Contracts.Models;

namespace HabitTracker.Modules.Tasks.Contracts.Requests;

public sealed record CreateTaskRequest(string Name, TaskColor Color = TaskColor.Slate);
