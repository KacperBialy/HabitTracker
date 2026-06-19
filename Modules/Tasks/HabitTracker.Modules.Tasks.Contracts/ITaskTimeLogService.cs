namespace HabitTracker.Modules.Tasks.Contracts;

public interface ITaskTimeLogService
{
    Task<TimeLogDto?> LogTime(Guid ownerId, TaskId taskId, LogTimeRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<TimeLogDto>> ListTimeLogs(Guid ownerId, TaskId taskId, CancellationToken ct = default);

    Task<bool> DeleteTimeLog(Guid ownerId, TaskId taskId, TimeLogId id, CancellationToken ct = default);
}
