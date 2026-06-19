# Integration: Authentication → Users

- **Producer (caller):** `HabitTracker.Authentication`
- **Consumer (callee):** Users module, via `Users.Contracts`
- **Mechanism:** synchronous interface call — `IUserService.Create`
- **Where:** OIDC `OnTokenValidated` event handler in `HabitTracker.Authentication/DependencyInjection.cs`

## What is exchanged

On every successful OIDC login, Authentication maps the validated `ClaimsPrincipal` to a
`CreateUserRequest` and calls:

```csharp
Task<UserDto> IUserService.Create(CreateUserRequest request, CancellationToken ct = default);
```

### Claim → request mapping

| OIDC claim | Maps to | Required |
|------------|---------|----------|
| `ClaimTypes.NameIdentifier` (`sub`) | `CreateUserRequest.Subject` | Yes — throws if missing |
| `ClaimTypes.Email` | `CreateUserRequest.Email` | Yes — throws if missing |
| `ClaimTypes.Name` (falls back to email) | `CreateUserRequest.DisplayName` | No |

## Expected behavior (the contract)

- `Create` is an **upsert keyed on `Subject`**: registers a new user on first login, updates
  email/display-name + last-login on subsequent logins. Authentication relies on this — it calls
  `Create` unconditionally on every login and never distinguishes new vs. returning users.
- The returned `UserDto.Id` is added to the cookie identity as the **`uid`** claim, which the host
  later reads (`ClaimsPrincipal.GetUserId()`) to scope module calls such as `ITaskService`.

## Failure handling

- If `sub` or `email` is absent, the mapping throws, and token validation fails — the login is
  rejected. Display name is best-effort (falls back to email).
- The call is in-process and synchronous; there is no retry. A failure in `Create` fails the login.

## What counts as a breaking change

- Changing `Create` so it no longer upserts by `Subject` (e.g. throwing on an existing subject).
- Reordering `CreateUserRequest`'s positional parameters, or adding a required one.
- Removing `UserDto.Id`, or changing its type away from `UserId` — the host depends on it for `uid`.

## Configuration

OIDC is bound from the **`Oidc`** config section (`OidcOptions.SectionName`):

```jsonc
"Oidc": {
  "Authority":    "https://accounts.google.com",   // default provider: Google
  "ClientId":     "...",
  "ClientSecret": "..."
}
```

`/login` (challenge) and `/logout` (sign out cookie + OIDC) are defined in
`HabitTracker.Authentication/Endpoints/AuthEndpoints.cs`.
