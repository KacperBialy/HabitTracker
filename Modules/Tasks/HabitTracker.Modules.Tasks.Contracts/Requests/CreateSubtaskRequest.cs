using HabitTracker.Modules.Tasks.Contracts.Models;

namespace HabitTracker.Modules.Tasks.Contracts.Requests;

public sealed record CreateSubtaskRequest(
    string Name,
    TaskColor Color = TaskColor.Slate);
