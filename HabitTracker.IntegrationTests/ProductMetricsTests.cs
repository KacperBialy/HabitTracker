using System.Net.Http.Json;
using FluentAssertions;
using HabitTracker.IntegrationTests.Configurations;
using HabitTracker.Modules.Tasks.Contracts.Models;
using HabitTracker.Modules.Tasks.Contracts.Requests;

namespace HabitTracker.IntegrationTests;

/// <summary>
/// Guards the whole custom-metrics chain: the domain services increment the counters AND the
/// "HabitTracker" meter is registered with OpenTelemetry, so they reach the scrape endpoint.
/// Dropping the <c>AddMeter</c> call fails these tests rather than silently exporting nothing.
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class ProductMetricsTests(ApiFactory factory)
{
    [Fact]
    public async Task CreatingATaskAndLoggingTimeExportsTheProductCounters()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client, TaskColor.Teal);

        var logged = await client.PostAsJsonAsync(
            $"/api/tasks/{task.Id}/timelogs",
            new LogTimeRequest(45, new DateOnly(2026, 6, 19), FromTimer: true));
        logged.EnsureSuccessStatusCode();

        var scrape = await client.GetStringAsync("/api/metrics");

        scrape.Should().Contain("habittracker_tasks_created_total");
        scrape.Should().Contain("color=\"Teal\"");
        scrape.Should().Contain("habittracker_time_logs_created_total");
        scrape.Should().Contain("habittracker_tracked_minutes_total");
        scrape.Should().Contain("source=\"timer\"");
    }

    [Fact]
    public async Task LoggingTimeWithoutTheTimerFlagIsTaggedAsManual()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client, TaskColor.Violet);

        var logged = await client.PostAsJsonAsync(
            $"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(30, new DateOnly(2026, 6, 19)));
        logged.EnsureSuccessStatusCode();

        var scrape = await client.GetStringAsync("/api/metrics");

        scrape.Should().Contain("source=\"manual\"");
    }

    [Fact]
    public async Task DeletingATaskExportsTheDeletionCounter()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client, TaskColor.Slate);

        var deleted = await client.DeleteAsync($"/api/tasks/{task.Id}");
        deleted.EnsureSuccessStatusCode();

        var scrape = await client.GetStringAsync("/api/metrics");

        scrape.Should().Contain("habittracker_tasks_deleted_total");
    }

    [Fact]
    public async Task DeletingATimeLogExportsTheDeletionCounters()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client, TaskColor.Slate);
        var logged = await client.PostAsJsonAsync(
            $"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(45, new DateOnly(2026, 6, 19)));
        var created = await logged.Content.ReadFromJsonAsync<TimeLogDto>();
        created.Should().NotBeNull();

        var deleted = await client.DeleteAsync($"/api/tasks/{task.Id}/timelogs/{created.Id}");
        deleted.EnsureSuccessStatusCode();

        var scrape = await client.GetStringAsync("/api/metrics");

        scrape.Should().Contain("habittracker_time_logs_deleted_total");
        scrape.Should().Contain("habittracker_tracked_deleted_minutes_total");
    }

    private static async Task<TaskDto> CreateTask(HttpClient client, TaskColor color)
    {
        var create = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest("Metrics task", color));
        var task = await create.Content.ReadFromJsonAsync<TaskDto>();
        task.Should().NotBeNull();
        return task;
    }
}
