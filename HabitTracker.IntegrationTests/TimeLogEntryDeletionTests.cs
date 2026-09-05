using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HabitTracker.IntegrationTests.Configurations;
using HabitTracker.Modules.Tasks.Contracts.Models;
using HabitTracker.Modules.Tasks.Contracts.Requests;

namespace HabitTracker.IntegrationTests;

/// <summary>
/// Deleting a log entry from the history view. The history is served by
/// <c>/api/tasks/timelogs/entries</c>, so each <see cref="DayEntryDto"/> must expose
/// the <see cref="TimeLogId"/> that the existing
/// <c>DELETE /api/tasks/{taskId}/timelogs/{logId}</c> route needs.
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class TimeLogEntryDeletionTests(ApiFactory factory)
{
    private static readonly DateOnly Day = new(2026, 6, 19);

    [Fact]
    public async Task EntriesExposeTheTimeLogIdSoAnEntryCanBeDeleted()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client);
        var created = await LogTime(client, task, 45, Day);

        var entries = await GetEntries(client, Day, Day);

        entries.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(
                new DayEntryDto(created.Id, Day, task.Id, task.Name, 45, TaskColor.Slate));
    }

    [Fact]
    public async Task DeletingAnEntryRemovesOnlyThatEntryFromTheHistory()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var piano = await CreateTask(client, "Piano");
        var reading = await CreateTask(client, "Reading");
        var toDelete = await LogTime(client, piano, 45, Day);
        var samePianoKept = await LogTime(client, piano, 30, Day);
        var readingKept = await LogTime(client, reading, 20, Day);

        var delete = await client.DeleteAsync($"/api/tasks/{piano.Id}/timelogs/{toDelete.Id}");
        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var entries = await GetEntries(client, Day, Day);

        entries.Select(entry => entry.Id).Should().BeEquivalentTo([samePianoKept.Id, readingKept.Id]);
        entries.Should().BeEquivalentTo([
            new DayEntryDto(samePianoKept.Id, Day, piano.Id, "Piano", 30, TaskColor.Slate),
            new DayEntryDto(readingKept.Id, Day, reading.Id, "Reading", 20, TaskColor.Slate)
        ], options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task DeletingAnEntryLowersThatDaysAggregate()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client);
        await LogTime(client, task, 30, Day);
        var toDelete = await LogTime(client, task, 15, Day);

        await client.DeleteAsync($"/api/tasks/{task.Id}/timelogs/{toDelete.Id}");

        var aggregates = await client.GetFromJsonAsync<YearAggregatesDto>(
            $"/api/tasks/timelogs/aggregates?year={Day.Year}");

        aggregates!.Days.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new DailyAggregateDto(Day, 30, 1));
    }

    [Fact]
    public async Task DeletingTheLastEntryOfADayRemovesTheDayFromAggregates()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client);
        var otherDay = Day.AddDays(1);
        var toDelete = await LogTime(client, task, 45, Day);
        await LogTime(client, task, 10, otherDay);

        await client.DeleteAsync($"/api/tasks/{task.Id}/timelogs/{toDelete.Id}");

        var aggregates = await client.GetFromJsonAsync<YearAggregatesDto>(
            $"/api/tasks/timelogs/aggregates?year={Day.Year}");

        aggregates!.Days.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new DailyAggregateDto(otherDay, 10, 1));
    }

    [Fact]
    public async Task DeletingAnEntryDoesNotAffectOtherDays()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client);
        var otherDay = Day.AddDays(-1);
        var toDelete = await LogTime(client, task, 45, Day);
        var kept = await LogTime(client, task, 25, otherDay);

        await client.DeleteAsync($"/api/tasks/{task.Id}/timelogs/{toDelete.Id}");

        var entries = await GetEntries(client, otherDay, Day);

        entries.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(
                new DayEntryDto(kept.Id, otherDay, task.Id, task.Name, 25, TaskColor.Slate));
    }

    [Fact]
    public async Task DeletingAnEntryTwiceReturnsNotFoundAndLeavesTheHistoryUnchanged()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client);
        var toDelete = await LogTime(client, task, 45, Day);
        var kept = await LogTime(client, task, 30, Day);

        var first = await client.DeleteAsync($"/api/tasks/{task.Id}/timelogs/{toDelete.Id}");
        var second = await client.DeleteAsync($"/api/tasks/{task.Id}/timelogs/{toDelete.Id}");

        first.StatusCode.Should().Be(HttpStatusCode.NoContent);
        second.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var entries = await GetEntries(client, Day, Day);
        entries.Select(entry => entry.Id).Should().ContainSingle().Which.Should().Be(kept.Id);
    }

    [Fact]
    public async Task DeletingAnEntryThatWasNeverLoggedReturnsNotFound()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client);
        var kept = await LogTime(client, task, 45, Day);

        var delete = await client.DeleteAsync($"/api/tasks/{task.Id}/timelogs/{Guid.NewGuid()}");

        delete.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var entries = await GetEntries(client, Day, Day);
        entries.Select(entry => entry.Id).Should().ContainSingle().Which.Should().Be(kept.Id);
    }

    [Fact]
    public async Task AnotherUserCannotDeleteAnEntryFromSomeoneElsesHistory()
    {
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();
        var ownerClient = factory.ClientFor(owner);
        var task = await CreateTask(ownerClient);
        var created = await LogTime(ownerClient, task, 45, Day);

        var delete = await factory.ClientFor(other)
            .DeleteAsync($"/api/tasks/{task.Id}/timelogs/{created.Id}");

        delete.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var ownerEntries = await GetEntries(ownerClient, Day, Day);
        ownerEntries.Select(entry => entry.Id).Should().ContainSingle().Which.Should().Be(created.Id);

        var ownerAggregates = await ownerClient.GetFromJsonAsync<YearAggregatesDto>(
            $"/api/tasks/timelogs/aggregates?year={Day.Year}");
        ownerAggregates!.Days.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new DailyAggregateDto(Day, 45, 1));
    }

    private static async Task<List<DayEntryDto>> GetEntries(HttpClient client, DateOnly from, DateOnly to)
    {
        var entries = await client.GetFromJsonAsync<List<DayEntryDto>>(
            $"/api/tasks/timelogs/entries?from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}");
        entries.Should().NotBeNull();
        return entries;
    }

    private static async Task<TimeLogDto> LogTime(HttpClient client, TaskDto task, int minutes, DateOnly date)
    {
        var response = await client.PostAsJsonAsync($"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(minutes, date));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<TimeLogDto>();
        created.Should().NotBeNull();
        return created;
    }

    private static async Task<TaskDto> CreateTask(HttpClient client, string name = "Practice piano")
    {
        var create = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest(name));
        var task = await create.Content.ReadFromJsonAsync<TaskDto>();
        task.Should().NotBeNull();
        return task;
    }
}
