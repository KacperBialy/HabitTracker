# Integration: `UserRegistered` domain event

- **Producer:** Users module (`HabitTracker.Modules.Users/Domain/Events/UserRegistered.cs`)
- **Consumers:** **none today** — this is a dormant extension point.
- **Mechanism:** in-process domain event, dispatched by the host after persistence.

## Payload

```csharp
public sealed record UserRegistered(
    UserId Id,
    string Email,
    string DisplayName,
    DateTimeOffset RegisteredAt) : IDomainEvent;
```

The record is **public** (the only public type outside a Contracts project) so handlers in other
modules can subscribe by type. `UserId` comes from `Users.Contracts`.

## When it fires

- Published from `UserService.Create` **only when a new user is registered** — not on the
  update-details path of the upsert.
- Dispatched **after `SaveChangesAsync`**, so the user row is committed before any handler runs.

## How dispatch works

The host implements `IDomainEventDispatcher` (`HabitTracker/Infrastructure/DomainEventDispatcher.cs`):

```csharp
public async Task DispatchAsync<TEvent>(TEvent domainEvent, CancellationToken ct = default)
    where TEvent : IDomainEvent
{
    var handlers = services.GetServices<IDomainEventHandler<TEvent>>();
    foreach (var handler in handlers)
        await handler.HandleAsync(domainEvent, ct);
}
```

All `IDomainEventHandler<UserRegistered>` registered in DI are resolved and invoked **sequentially,
in-process, synchronously** within the same request/scope.

## How to consume it (for a future module)

1. In the consuming module's impl project, implement
   `IDomainEventHandler<UserRegistered>` (an `internal sealed` class).
2. Register it in that module's `Add<Name>Module` extension:
   `services.AddScoped<IDomainEventHandler<UserRegistered>, MyHandler>();`
3. That's the entire coupling — the consumer references `Users.Contracts` (for `UserId`) and
   `SharedKernel` only. No reference to the Users implementation.

## Failure & ordering expectations

- **No retry, no outbox, no async queue.** Handlers run inline; a throwing handler propagates and
  fails the originating operation. The event is *not* re-delivered.
- Handlers run **after commit**, so the producer's writing is durable, but a handler's own
  side effects are **not** in the producer's transaction. Design handlers to be idempotent.
- Invocation order across multiple handlers is a DI-registration order; do not depend on it.

## What counts as a breaking change

- Removing/renaming/reordering any payload field.
- Changing the firing condition (e.g. also firing on update, or before commit).
- Making the type non-public (would break external handlers).

> See [ADR-0004](../adr/0004-in-process-domain-events.md) for why events are in-process and
> handler-based rather than mediator- or queue-based.
