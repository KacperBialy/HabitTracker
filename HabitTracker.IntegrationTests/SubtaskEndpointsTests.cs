using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HabitTracker.IntegrationTests.Configurations;
using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Contracts.Models;
using HabitTracker.Modules.Tasks.Contracts.Requests;

namespace HabitTracker.IntegrationTests;

[Collection(ApiCollection.Name)]
public sealed class SubtaskEndpointsTests(ApiFactory factory)
{
    [Fact]
    public async Task CreatingASubtaskInheritsNothingAndAppearsInTheList()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var parent = await CreateTask(client, "Reading", TaskColor.Green);

        var create = await CreateTaskResponse(client, "Chapter 1", TaskColor.Violet, parent.Id);
        create.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await create.Content.ReadFromJsonAsync<TaskDto>();
        created.Should().NotBeNull();
        created.ParentTaskId.Should().Be(parent.Id);
        created.Color.Should().Be(TaskColor.Violet);
        created.Name.Should().Be("Chapter 1");

        var list = await client.GetFromJsonAsync<List<TaskDto>>("/api/tasks");
        list.Should().HaveCount(2);
        list.Should().Contain(task => task.Id == parent.Id && task.ParentTaskId == null);
        list.Should().Contain(task => task.Id == created.Id && task.ParentTaskId == parent.Id);
    }

    [Fact]
    public async Task CreatingASubtaskUnderASubtaskIsRejected()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var parent = await CreateTask(client, "Reading");
        var child = await CreateTask(client, "Chapter 1", TaskColor.Slate, parent.Id);

        var nested = await CreateTaskResponse(client, "Too deep", TaskColor.Slate, child.Id);

        nested.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetFromJsonAsync<List<TaskDto>>("/api/tasks")).Should().HaveCount(2);
    }

    [Fact]
    public async Task CreatingASubtaskWithAnUnknownParentIsRejected()
    {
        var client = factory.ClientFor(Guid.NewGuid());

        var create = await CreateTaskResponse(client, "Orphan", TaskColor.Slate, new TaskId(Guid.NewGuid()));

        create.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetFromJsonAsync<List<TaskDto>>("/api/tasks")).Should().BeEmpty();
    }

    [Fact]
    public async Task CreatingASubtaskUnderAnotherUsersParentIsRejected()
    {
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();
        var ownerClient = factory.ClientFor(owner);
        var parent = await CreateTask(ownerClient, "Owner root");

        var hijack = await CreateTaskResponse(factory.ClientFor(other), "Nope", TaskColor.Red, parent.Id);

        hijack.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await ownerClient.GetFromJsonAsync<List<TaskDto>>("/api/tasks"))
            .Should().ContainSingle().Which.Id.Should().Be(parent.Id);
        (await factory.ClientFor(other).GetFromJsonAsync<List<TaskDto>>("/api/tasks"))
            .Should().BeEmpty();
    }

    [Fact]
    public async Task TimeCanBeLoggedAgainstASubtask()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var parent = await CreateTask(client, "Reading");
        var child = await CreateTask(client, "Chapter 1", TaskColor.Slate, parent.Id);

        var logged = await LogTime(client, child, 25, new DateOnly(2026, 6, 19));

        logged.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task DeletingAParentCascadesSubtasksAndTheirLogs()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var parent = await CreateTask(client, "Reading");
        var child = await CreateTask(client, "Chapter 1", TaskColor.Slate, parent.Id);
        var day = new DateOnly(2026, 6, 19);
        await LogTime(client, child, 25, day);
        await LogTime(client, parent, 10, day);

        var delete = await client.DeleteAsync($"/api/tasks/{parent.Id}");

        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.GetFromJsonAsync<List<TaskDto>>("/api/tasks")).Should().BeEmpty();
        (await client.GetFromJsonAsync<List<DayEntryDto>>(
            $"/api/tasks/timelogs/entries?from={day:yyyy-MM-dd}&to={day:yyyy-MM-dd}")).Should().BeEmpty();
        (await client.GetFromJsonAsync<List<TimeLogDto>>($"/api/tasks/{child.Id}/timelogs")).Should().BeEmpty();
    }

    [Fact]
    public async Task DeletingASubtaskLeavesTheParent()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var parent = await CreateTask(client, "Reading");
        var child = await CreateTask(client, "Chapter 1", TaskColor.Slate, parent.Id);

        var delete = await client.DeleteAsync($"/api/tasks/{child.Id}");

        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var list = await client.GetFromJsonAsync<List<TaskDto>>("/api/tasks");
        list.Should().ContainSingle().Which.Id.Should().Be(parent.Id);
    }

    [Fact]
    public async Task UpdatingAParentColorDoesNotRecolorChildren()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var parent = await CreateTask(client, "Reading", TaskColor.Green);
        var child = await CreateTask(client, "Chapter 1", TaskColor.Violet, parent.Id);

        var update = await client.PutAsJsonAsync($"/api/tasks/{parent.Id}",
            new UpdateTaskRequest("Deep reading", TaskColor.Blue));
        update.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var list = await client.GetFromJsonAsync<List<TaskDto>>("/api/tasks");
        list.Should().Contain(task => task.Id == parent.Id && task.Color == TaskColor.Blue && task.Name == "Deep reading");
        list.Should().Contain(task => task.Id == child.Id && task.Color == TaskColor.Violet);
    }

    [Fact]
    public async Task UpdatingASubtaskCanRenameAndRecolorIt()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var parent = await CreateTask(client, "Reading", TaskColor.Green);
        var child = await CreateTask(client, "Chapter 1", TaskColor.Violet, parent.Id);

        var update = await client.PutAsJsonAsync($"/api/tasks/{child.Id}",
            new UpdateTaskRequest("Chapter 2", TaskColor.Amber));
        update.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var list = await client.GetFromJsonAsync<List<TaskDto>>("/api/tasks");
        list.Should().Contain(task => task.Id == child.Id && task.Name == "Chapter 2" && task.Color == TaskColor.Amber);
        list.Should().Contain(task => task.Id == parent.Id && task.Color == TaskColor.Green);
    }

    [Fact]
    public async Task EntriesExposeParentOnSubtaskLogsAndNullOnRootLogs()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var parent = await CreateTask(client, "Reading", TaskColor.Green);
        var child = await CreateTask(client, "Chapter 1", TaskColor.Violet, parent.Id);
        var day = new DateOnly(2026, 6, 19);
        await LogTime(client, parent, 10, day);
        await LogTime(client, child, 25, day);

        var entries = await client.GetFromJsonAsync<List<DayEntryDto>>(
            $"/api/tasks/timelogs/entries?from={day:yyyy-MM-dd}&to={day:yyyy-MM-dd}");

        entries.Should().BeEquivalentTo([
            new DayEntryDto(default, day, child.Id, "Chapter 1", 25, TaskColor.Violet,
                new DayEntryParentDto(parent.Id, "Reading", TaskColor.Green)),
            new DayEntryDto(default, day, parent.Id, "Reading", 10, TaskColor.Green)
        ], options => options.Excluding(entry => entry.Id));
    }

    private static async Task<TaskDto> CreateTask(
        HttpClient client,
        string name,
        TaskColor color = TaskColor.Slate,
        TaskId? parentId = null)
    {
        var response = await CreateTaskResponse(client, name, color, parentId);
        response.EnsureSuccessStatusCode();
        var task = await response.Content.ReadFromJsonAsync<TaskDto>();
        task.Should().NotBeNull();
        return task;
    }

    private static Task<HttpResponseMessage> CreateTaskResponse(
        HttpClient client,
        string name,
        TaskColor color,
        TaskId? parentId) =>
        parentId is null
            ? client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest(name, color))
            : client.PostAsJsonAsync($"/api/tasks/{parentId}/subtasks", new CreateSubtaskRequest(name, color));

    private static Task<HttpResponseMessage> LogTime(HttpClient client, TaskDto task, int minutes, DateOnly date) =>
        client.PostAsJsonAsync($"/api/tasks/{task.Id}/timelogs", new LogTimeRequest(minutes, date));
}
