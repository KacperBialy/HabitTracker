namespace HabitTracker.Modules.Tasks.Contracts.Models;

/// <summary>
/// The parent of a subtask, denormalized onto a day entry so history and charts
/// can breadcrumb/roll up without joining the task list. <c>null</c> on root-task logs.
/// </summary>
public sealed record DayEntryParentDto(TaskId Id, string Name, TaskColor Color);
