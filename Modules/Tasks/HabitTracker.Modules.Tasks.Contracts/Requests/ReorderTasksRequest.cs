namespace HabitTracker.Modules.Tasks.Contracts.Requests;

public sealed record ReorderTasksRequest(
    TaskId? ParentTaskId,
    IReadOnlyList<TaskId> OrderedTaskIds);
