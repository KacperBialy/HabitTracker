namespace HabitTracker.SharedKernel.Events;

public interface IDomainEventDispatcher
{
    Task DispatchAsync<TEvent>(TEvent domainEvent, CancellationToken ct = default) where TEvent : IDomainEvent;
}
