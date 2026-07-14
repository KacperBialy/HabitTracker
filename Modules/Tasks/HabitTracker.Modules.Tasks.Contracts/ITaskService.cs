using HabitTracker.Modules.Tasks.Contracts.Models;
using HabitTracker.Modules.Tasks.Contracts.Requests;

namespace HabitTracker.Modules.Tasks.Contracts;

public interface ITaskService
{
    Task<TaskDto> Create(Guid ownerId, CreateTaskRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<TaskDto>> ListForOwner(Guid ownerId, CancellationToken ct = default);

    Task<bool> Update(Guid ownerId, TaskId id, UpdateTaskRequest request, CancellationToken ct = default);

    Task<bool> Delete(Guid ownerId, TaskId id, CancellationToken ct = default);
}
