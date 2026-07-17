using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HabitTracker.IntegrationTests.Configurations;
using HabitTracker.Modules.Tasks.Contracts.Models;
using HabitTracker.Modules.Tasks.Contracts.Requests;

namespace HabitTracker.IntegrationTests;

[Collection(ApiCollection.Name)]
public sealed class TimeLogAggregatesTests(ApiFactory factory)
{
    [Fact]
    public async Task YearAggregatesGroupMinutesAndCountsPerDay()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client);
        var day1 = new DateOnly(2026, 3, 10);
        var day2 = new DateOnly(2026, 3, 12);

        // day1: two entries (30 + 15), day2: one entry (45).
        await LogTime(client, task, 30, day1);
        await LogTime(client, task, 15, day1);
        await LogTime(client, task, 45, day2);

        var result = await client.GetFromJsonAsync<YearAggregatesDto>("/api/tasks/timelogs/aggregates?year=2026");

        result.Should().NotBeNull();
        result.Year.Should().Be(2026);
        result.Days.Should().BeInAscendingOrder(day => day.Date);
        result.Days.Should().BeEquivalentTo([
            new DailyAggregateDto(day1, 45, 2),
            new DailyAggregateDto(day2, 45, 1)
        ], options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task YearAggregatesAggregateAcrossAllOfTheUsersTasks()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var taskA = await CreateTask(client, "Task A");
        var taskB = await CreateTask(client, "Task B");
        var day = new DateOnly(2026, 5, 1);

        await LogTime(client, taskA, 20, day);
        await LogTime(client, taskB, 25, day);

        var result = await client.GetFromJsonAsync<YearAggregatesDto>("/api/tasks/timelogs/aggregates?year=2026");

        result!.Days.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new DailyAggregateDto(day, 45, 2));
    }

    [Fact]
    public async Task YearAggregatesFilterByTheRequestedYear()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client);
        var in2025 = new DateOnly(2025, 7, 4);
        var in2026 = new DateOnly(2026, 7, 4);

        await LogTime(client, task, 60, in2025);
        await LogTime(client, task, 90, in2026);

        var result2025 = await client.GetFromJsonAsync<YearAggregatesDto>("/api/tasks/timelogs/aggregates?year=2025");

        result2025!.Year.Should().Be(2025);
        result2025.Days.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new DailyAggregateDto(in2025, 60, 1));
    }

    [Fact]
    public async Task YearAggregatesDefaultToTheCurrentYearWhenOmitted()
    {
        var client = factory.ClientFor(Guid.NewGuid());

        var result = await client.GetFromJsonAsync<YearAggregatesDto>("/api/tasks/timelogs/aggregates");

        // No year param => server resolves the current year via TimeProvider.
        result.Should().NotBeNull();
        result.Year.Should().Be(DateTime.UtcNow.Year);
    }

    [Fact]
    public async Task YearAggregatesAreScopedToTheirOwner()
    {
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();
        var ownerClient = factory.ClientFor(owner);
        var task = await CreateTask(ownerClient);
        await LogTime(ownerClient, task, 45, new DateOnly(2026, 6, 19));

        var otherResult = await factory.ClientFor(other)
            .GetFromJsonAsync<YearAggregatesDto>("/api/tasks/timelogs/aggregates?year=2026");

        otherResult.Should().NotBeNull();
        otherResult.Days.Should().BeEmpty();
    }

    [Fact]
    public async Task EntriesReturnEachLogInRangeNewestDayFirstThenByMinutesDesc()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var piano = await CreateTask(client, "Piano");
        var reading = await CreateTask(client, "Reading");
        var day1 = new DateOnly(2026, 6, 18);
        var day2 = new DateOnly(2026, 6, 19);

        await LogTime(client, reading, 30, day2);
        await LogTime(client, piano, 45, day2);
        await LogTime(client, piano, 99, day1);
        // A log outside the range must not leak in.
        await LogTime(client, piano, 10, new DateOnly(2026, 6, 17));

        var entries = await client.GetFromJsonAsync<List<DayEntryDto>>(
            "/api/tasks/timelogs/entries?from=2026-06-18&to=2026-06-19");

        entries.Should().BeEquivalentTo([
            new DayEntryDto(day2, piano.Id, "Piano", 45, TaskColor.Slate),
            new DayEntryDto(day2, reading.Id, "Reading", 30, TaskColor.Slate),
            new DayEntryDto(day1, piano.Id, "Piano", 99, TaskColor.Slate)
        ], options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task EntriesAreScopedToTheirOwner()
    {
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();
        var ownerClient = factory.ClientFor(owner);
        var task = await CreateTask(ownerClient);
        var day = new DateOnly(2026, 6, 19);
        await LogTime(ownerClient, task, 45, day);

        var otherEntries = await factory.ClientFor(other)
            .GetFromJsonAsync<List<DayEntryDto>>("/api/tasks/timelogs/entries?from=2026-06-19&to=2026-06-19");

        otherEntries.Should().NotBeNull();
        otherEntries.Should().BeEmpty();
    }

    [Fact]
    public async Task EntriesRejectAnInvertedRange()
    {
        var client = factory.ClientFor(Guid.NewGuid());

        var response = await client.GetAsync("/api/tasks/timelogs/entries?from=2026-06-19&to=2026-06-18");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private static async Task LogTime(HttpClient client, TaskDto task, int minutes, DateOnly date) =>
        await client.PostAsJsonAsync($"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(minutes, date));

    private static async Task<TaskDto> CreateTask(HttpClient client, string name = "Practice piano")
    {
        var create = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest(name));
        var task = await create.Content.ReadFromJsonAsync<TaskDto>();
        task.Should().NotBeNull();
        return task;
    }
}
