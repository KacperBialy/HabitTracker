# Users module

## Responsibility

Owns user identity provisioned from authentication. On first OIDC login it **registers** a
user; on subsequent logins it **updates** their details (email, display name) and records the
login time. It is the system's source of truth for "who is a user," keyed by the OIDC
`Subject`.

## Public API

Everything below lives in `HabitTracker.Modules.Users.Contracts`. It is the **only** part of
this module other projects may reference.

### `IUserService`

```csharp
Task<UserDto>  Create(CreateUserRequest request, CancellationToken ct = default);   // upsert
Task<UserDto?> GetByIdAsync(UserId id, CancellationToken ct = default);
```

`Create` is an **upsert**: register-if-new, update-details-if-existing, matched on `Subject`.

### DTOs & requests

```csharp
record CreateUserRequest(string Subject, string Email, string DisplayName);
record UserDto(UserId Id, string Subject, string Email, string DisplayName,
               DateTimeOffset CreatedAt, DateTimeOffset LastLoginAt);
```

### Strongly-typed ID

```csharp
readonly record struct UserId(Guid Value);   // UserId.New() => Guid.CreateVersion7()
```

### Domain events (published)

```csharp
public sealed record UserRegistered(UserId Id, string Email, string DisplayName,
                                    DateTimeOffset RegisteredAt) : IDomainEvent;
```

Published in-process after a **new** user is persisted (not on update). Event records are
public so handlers in other modules can subscribe. See
[../../docs/integrations/user-registered-event.md](../../docs/integrations/user-registered-event.md).

## Dependencies

- **`Users.Contracts`** — its own public API.
- **`SharedKernel`** — for `IDomainEvent` / `IDomainEventDispatcher`.

Consumes **no other module**. Its only external consumer is `HabitTracker.Authentication`,
which calls `IUserService.Create` — see
[../../docs/integrations/auth-to-users.md](../../docs/integrations/auth-to-users.md).

## Key concepts (ubiquitous language)

- **Subject** — the OIDC `sub` claim; the natural key for upsert. External identity.
- **UserId** — our internal identity (GUID v7). Generated at registration.
- **Register** — `User.Register(subject, email, displayName, now)` static factory.
- **UpdateDetails** — `User.UpdateDetails(email, displayName, now)` on subsequent login.

See the project-wide [glossary](../../docs/glossary.md).

## What it does NOT do

- No authentication / token handling — that's `HabitTracker.Authentication`.
- No authorization, roles, or permissions.
- Does not know about tasks or any other module's data.
- Does not expose query/listing APIs beyond `GetByIdAsync`.

## Persistence & local dev

- **Schema:** `users` (own `__EFMigrationsHistory` in that schema).
- **`DbContext`:** `UsersDbContext` (internal).
- **Connection string key:** `Users`, falling back to `Default`.
- **Migrations:** `Persistence/Migrations/` (initial: `InitialUsers`).
- **Constraints:** unique index on `Subject` and on `Email`; max lengths Subject 256, Email 320, DisplayName 256.

```bash
dotnet ef migrations add <Name> --project Modules/Users/HabitTracker.Modules.Users
dotnet ef database update        --project Modules/Users/HabitTracker.Modules.Users
```

Design-time migrations use `UsersDbContextFactory` with a hardcoded localhost connection
(`Host=localhost;Database=habittracker;Username=postgres;Password=postgres`).
