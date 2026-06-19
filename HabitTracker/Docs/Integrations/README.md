# Cross-module integration points

Each file here documents one contract between two parts so that changes don't silently
break consumers. A contract is a Contracts interface method or a domain-event payload.

| Integration | Producer | Consumer | Mechanism |
|-------------|----------|----------|-----------|
| [auth-to-users.md](auth-to-users.md) | Authentication | Users (`IUserService.Create`) | Synchronous interface call |
| [user-registered-event.md](user-registered-event.md) | Users (`UserRegistered`) | _none yet_ | In-process domain event |

## Versioning policy (applies to all contracts here)

A change is **breaking** if it can make an existing consumer fail to compile or behave
differently without opting in:

- Removing/renaming a Contracts type, method, or member.
- Adding a required parameter or reordering a record's positional parameters.
- Changing a method's semantics (e.g. making `Create` no longer upsert).
- For events: removing/renaming/reordering a payload field, or changing when it fires.

Non-breaking: adding a new method, adding a new event type, adding an optional parameter with a
default. Breaking changes require updating every consumer in the same change and noting it in an
ADR if it alters a documented decision.
