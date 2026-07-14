using HabitTracker.Modules.Tasks.Contracts.Models;

namespace HabitTracker.Modules.Tasks.Contracts.Requests;

public sealed record UpdateTaskRequest(string Name, TaskColor Color = TaskColor.Slate);
