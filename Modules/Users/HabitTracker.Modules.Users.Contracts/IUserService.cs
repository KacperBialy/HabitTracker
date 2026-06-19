using HabitTracker.Modules.Users.Contracts.Models;
using HabitTracker.Modules.Users.Contracts.Requests;

namespace HabitTracker.Modules.Users.Contracts;

public interface IUserService
{
    Task<UserDto> Create(CreateUserRequest request, CancellationToken ct = default);

    Task<UserDto?> GetByIdAsync(UserId id, CancellationToken ct = default);
}
