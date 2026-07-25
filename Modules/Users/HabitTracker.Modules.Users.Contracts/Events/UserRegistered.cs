using HabitTracker.SharedKernel.Events;

namespace HabitTracker.Modules.Users.Contracts.Events;

public sealed record UserRegistered(UserId Id, string Email, string DisplayName, DateTimeOffset RegisteredAt)
    : IDomainEvent;
