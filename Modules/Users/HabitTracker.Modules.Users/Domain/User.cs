using HabitTracker.Modules.Users.Contracts;
using HabitTracker.Modules.Users.Contracts.Models;

namespace HabitTracker.Modules.Users.Domain;

internal sealed class User
{
    private User() { }

    private User(UserId id, string subject, string email, string displayName, DateTimeOffset now)
    {
        Id = id;
        Subject = subject;
        Email = email;
        DisplayName = displayName;
        CreatedAt = now;
        LastLoginAt = now;
    }

    public UserId Id { get; private set; }
    public string Subject { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string DisplayName { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset LastLoginAt { get; private set; }

    public static User Register(string subject, string email, string displayName, DateTimeOffset now) =>
        new(UserId.New(), subject, email, displayName, now);

    public void UpdateDetails(string email, string displayName, DateTimeOffset now)
    {
        Email = email;
        DisplayName = displayName;
        LastLoginAt = now;
    }

    public UserDto ToDto() => new(Id, Subject, Email, DisplayName, CreatedAt, LastLoginAt);
}
