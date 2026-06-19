# ADR-0004: In-process, handler-based domain events

**Status:** Accepted

## Context

Modules will eventually need to react to things that happen in other modules (e.g. a future
module reacting to a user registering) without a compile-time dependency on the producer's
internals. Options: direct interface calls (tight, synchronous, producer must know consumers),
a mediator library (MediatR — extra dependency, indirection), or an out-of-process message bus
(durable, async, but heavy infrastructure for a single-process app).

## Decision

A tiny in-house event abstraction in `SharedKernel/Events`:

```csharp
interface IDomainEvent { }                                  // marker
interface IDomainEventHandler<in TEvent> where TEvent : IDomainEvent
    { Task HandleAsync(TEvent e, CancellationToken ct = default); }
interface IDomainEventDispatcher
    { Task DispatchAsync<TEvent>(TEvent e, CancellationToken ct = default) where TEvent : IDomainEvent; }
```

The host implements `IDomainEventDispatcher` by resolving **all** registered
`IDomainEventHandler<TEvent>` from DI and invoking them sequentially, in-process. Producers
publish events from their Application service **after `SaveChangesAsync`**. Event records are the
one public type allowed outside Contracts, so consumers subscribe by type. No mediator library,
no message broker.

## Consequences

**Easier**
- Producer and consumer are decoupled at compile time — the producer never names its consumers.
- No third-party dependency; the whole mechanism is ~3 interfaces + one dispatcher.
- A new consumer is just an `IDomainEventHandler<T>` registered in its own `Add<Name>Module`.

**Harder**
- **Synchronous & in-process:** handlers run inline in the request; a throwing handler fails the
  operation, and there is **no retry, outbox, or re-delivery**. Handlers should be idempotent.
- Events fire **after commit**, so handler side effects are outside the producer's transaction —
  at-most-once, not transactional with the writing.
- No built-in ordering guarantees across handlers (DI registration order only).
- If we later need durability or async fan-out, the dispatcher implementation must be swapped for
  an outbox/broker — the interfaces are designed to allow that without touching producers.

See [user-registered-event.md](../integrations/user-registered-event.md) for the live (currently
unsubscribed) `UserRegistered` event.
