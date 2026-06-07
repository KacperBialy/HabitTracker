namespace HabitTracker.Modules.Users.Contracts;

public sealed record CreateUserRequest(
    string Subject,
    string Email,
    string DisplayName);
