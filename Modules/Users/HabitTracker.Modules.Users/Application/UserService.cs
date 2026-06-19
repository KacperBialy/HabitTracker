using HabitTracker.Modules.Users.Contracts;
using HabitTracker.Modules.Users.Contracts.Models;
using HabitTracker.Modules.Users.Contracts.Requests;
using HabitTracker.Modules.Users.Domain;
using HabitTracker.Modules.Users.Domain.Events;
using HabitTracker.Modules.Users.Persistence;
using HabitTracker.SharedKernel.Events;
using Microsoft.EntityFrameworkCore;
using TimeProvider = System.TimeProvider;

namespace HabitTracker.Modules.Users.Application;

internal sealed class UserService(
    UsersDbContext db,
    IDomainEventDispatcher events,
    TimeProvider clock) : IUserService
{
    public async Task<UserDto> Create(CreateUserRequest request, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Subject == request.Subject, ct);

        if (user is null)
        {
            user = User.Register(request.Subject, request.Email, request.DisplayName, now);
            db.Users.Add(user);
            await db.SaveChangesAsync(ct);

            await events.DispatchAsync(
                new UserRegistered(user.Id, user.Email, user.DisplayName, now), ct);

            return user.ToDto();
        }

        user.UpdateDetails(request.Email, request.DisplayName, now);
        await db.SaveChangesAsync(ct);
        return user.ToDto();
    }

    public async Task<UserDto?> GetByIdAsync(UserId id, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == id, ct);
        return user?.ToDto();
    }
}
