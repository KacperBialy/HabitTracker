namespace HabitTracker.Modules.Users.Contracts;

public sealed record UserDto(
    UserId Id,
    string Subject,
    string Email,
    string DisplayName,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastLoginAt);
