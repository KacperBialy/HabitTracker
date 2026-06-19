namespace HabitTracker.Modules.Users.Contracts.Requests;

public sealed record CreateUserRequest(
    string Subject,
    string Email,
    string DisplayName);
