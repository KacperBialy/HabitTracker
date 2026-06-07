using HabitTracker.Modules.Users.Contracts;
using HabitTracker.SharedKernel.Events;

namespace HabitTracker.Modules.Users.Domain.Events;

public sealed record UserRegistered(UserId Id, string Email, string DisplayName, DateTimeOffset RegisteredAt)
    : IDomainEvent;
