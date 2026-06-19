using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HabitTracker.IntegrationTests.Configurations;
using HabitTracker.Modules.Tasks.Contracts;

namespace HabitTracker.IntegrationTests;

[Collection(ApiCollection.Name)]
public sealed class TimeLogEndpointsTests(ApiFactory factory)
{
    [Fact]
    public async Task LoggingTimeMakesItAppearInTheTasksLog()
    {
        var owner = Guid.NewGuid();
        var client = factory.ClientFor(owner);
        var task = await CreateTask(client);
        var today = new DateOnly(2026, 6, 19);

        var response = await client.PostAsJsonAsync(
            $"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(45, today));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<TimeLogDto>();
        created.Should().NotBeNull();
        created.Minutes.Should().Be(45);
        created.LogDate.Should().Be(today);
        created.TaskId.Should().Be(task.Id);
        created.OwnerId.Should().Be(owner);

        var list = await client.GetFromJsonAsync<List<TimeLogDto>>($"/api/tasks/{task.Id}/timelogs");

        list.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(created);
    }

    [Fact]
    public async Task LoggingTimeAgainstANonExistentTaskReturnsNotFound()
    {
        var client = factory.ClientFor(Guid.NewGuid());

        var log = await client.PostAsJsonAsync(
            $"/api/tasks/{Guid.NewGuid()}/timelogs", new LogTimeRequest(45, new DateOnly(2026, 6, 19)));

        log.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task LoggingTimeAgainstAnotherUsersTaskReturnsNotFound()
    {
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();
        var task = await CreateTask(factory.ClientFor(owner));

        var log = await factory.ClientFor(other).PostAsJsonAsync(
            $"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(45, new DateOnly(2026, 6, 19)));

        log.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(1441)]
    public async Task LoggingInvalidDurationIsRejected(int minutes)
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client);

        var log = await client.PostAsJsonAsync(
            $"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(minutes, new DateOnly(2026, 6, 19)));

        log.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var list = await client.GetFromJsonAsync<List<TimeLogDto>>($"/api/tasks/{task.Id}/timelogs");
        list.Should().BeEmpty();
    }

    [Fact]
    public async Task TimeLogsAreScopedToTheirOwner()
    {
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();
        var task = await CreateTask(factory.ClientFor(owner));

        await factory.ClientFor(owner).PostAsJsonAsync(
            $"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(45, new DateOnly(2026, 6, 19)));

        // Another user does not own the task, so they cannot see its logs.
        var otherList = await factory.ClientFor(other)
            .GetFromJsonAsync<List<TimeLogDto>>($"/api/tasks/{task.Id}/timelogs");

        otherList.Should().NotBeNull();
        otherList.Should().BeEmpty();
    }

    [Fact]
    public async Task DeletingATimeLogRemovesItFromTheList()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client);

        var log = await client.PostAsJsonAsync(
            $"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(45, new DateOnly(2026, 6, 19)));
        var created = await log.Content.ReadFromJsonAsync<TimeLogDto>();
        created.Should().NotBeNull();

        var delete = await client.DeleteAsync($"/api/tasks/{task.Id}/timelogs/{created!.Id}");
        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var list = await client.GetFromJsonAsync<List<TimeLogDto>>($"/api/tasks/{task.Id}/timelogs");
        list.Should().BeEmpty();

        var deleteAgain = await client.DeleteAsync($"/api/tasks/{task.Id}/timelogs/{created.Id}");
        deleteAgain.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeletingATimeLogThroughTheWrongTaskRouteIsRejected()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var taskA = await CreateTask(client, "Task A");
        var taskB = await CreateTask(client, "Task B");

        var log = await client.PostAsJsonAsync(
            $"/api/tasks/{taskA.Id}/timelogs", new LogTimeRequest(45, new DateOnly(2026, 6, 19)));
        var created = await log.Content.ReadFromJsonAsync<TimeLogDto>();
        created.Should().NotBeNull();

        var delete = await client.DeleteAsync($"/api/tasks/{taskB.Id}/timelogs/{created!.Id}");
        delete.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var list = await client.GetFromJsonAsync<List<TimeLogDto>>($"/api/tasks/{taskA.Id}/timelogs");
        list.Should().Contain(l => l.Id == created.Id);
    }

    [Fact]
    public async Task DeletingAnotherUsersTimeLogIsRejected()
    {
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();
        var task = await CreateTask(factory.ClientFor(owner));

        var log = await factory.ClientFor(owner).PostAsJsonAsync(
            $"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(45, new DateOnly(2026, 6, 19)));
        var created = await log.Content.ReadFromJsonAsync<TimeLogDto>();
        created.Should().NotBeNull();

        var delete = await factory.ClientFor(other)
            .DeleteAsync($"/api/tasks/{task.Id}/timelogs/{created!.Id}");
        delete.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var ownerList = await factory.ClientFor(owner)
            .GetFromJsonAsync<List<TimeLogDto>>($"/api/tasks/{task.Id}/timelogs");
        ownerList.Should().Contain(l => l.Id == created.Id);
    }

    [Fact]
    public async Task DeletingATaskCascadesToItsTimeLogs()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var task = await CreateTask(client);

        await client.PostAsJsonAsync(
            $"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(45, new DateOnly(2026, 6, 19)));

        var deleteTask = await client.DeleteAsync($"/api/tasks/{task.Id}");
        deleteTask.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Task is gone; its logs no longer belong to any owned task, so listing returns empty.
        var list = await client.GetFromJsonAsync<List<TimeLogDto>>($"/api/tasks/{task.Id}/timelogs");
        list.Should().BeEmpty();
    }

    private static async Task<TaskDto> CreateTask(HttpClient client, string name = "Practice piano")
    {
        var create = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest(name));
        var task = await create.Content.ReadFromJsonAsync<TaskDto>();
        task.Should().NotBeNull();
        return task;
    }
}
