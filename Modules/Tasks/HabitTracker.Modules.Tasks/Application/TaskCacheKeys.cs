namespace HabitTracker.Modules.Tasks.Application;

internal static class TaskCacheKeys
{
    public static string TasksForOwner(Guid ownerId) => $"tasks:owner:{ownerId}";
}