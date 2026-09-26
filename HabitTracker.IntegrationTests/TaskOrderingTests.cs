using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HabitTracker.IntegrationTests.Configurations;
using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Contracts.Models;
using HabitTracker.Modules.Tasks.Contracts.Requests;

namespace HabitTracker.IntegrationTests;

[Collection(ApiCollection.Name)]
public sealed class TaskOrderingTests(ApiFactory factory)
{
    [Fact]
    public async Task ListingExposesPositionAndANewRootListsFirst()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var first = await CreateTask(client, "First");
        var second = await CreateTask(client, "Second");

        var json = await client.GetStringAsync("/api/tasks");
        json.Should().Contain("\"position\"");

        var roots = Roots(await List(client));
        roots.Select(task => task.Id).Should().Equal(second.Id, first.Id);
        roots[0].Position.Should().BeLessThan(roots[1].Position);
    }

    [Fact]
    public async Task ANewSubtaskListsFirstAmongSiblingsAndLeavesRootsAlone()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var parent = await CreateTask(client, "Parent");
        var otherRoot = await CreateTask(client, "Other root");
        var rootsBefore = Roots(await List(client));

        var olderChild = await CreateTask(client, "Older child", parent.Id);
        var newerChild = await CreateTask(client, "Newer child", parent.Id);

        var list = await List(client);
        Children(list, parent.Id).Select(task => task.Id).Should().Equal(newerChild.Id, olderChild.Id);
        Roots(list).Should().BeEquivalentTo(rootsBefore, options => options.WithStrictOrdering());
        Roots(list).Select(task => task.Id).Should().Equal(otherRoot.Id, parent.Id);
    }

    [Fact]
    public async Task ReorderingRootsPersistsTheNewOrder()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var alpha = await CreateTask(client, "Alpha");
        var beta = await CreateTask(client, "Beta");
        var gamma = await CreateTask(client, "Gamma");

        var reorder = await Reorder(client, null, alpha.Id, gamma.Id, beta.Id);

        reorder.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var roots = Roots(await List(client));
        roots.Select(task => task.Id).Should().Equal(alpha.Id, gamma.Id, beta.Id);
        roots.Select(task => task.Position).Should().Equal(0, 1, 2);
    }

    [Fact]
    public async Task ReorderingSubtasksLeavesOtherGroupsUnchanged()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var parent = await CreateTask(client, "Parent");
        var otherParent = await CreateTask(client, "Other parent");
        var firstChild = await CreateTask(client, "First child", parent.Id);
        var secondChild = await CreateTask(client, "Second child", parent.Id);
        await CreateTask(client, "Cousin one", otherParent.Id);
        await CreateTask(client, "Cousin two", otherParent.Id);
        var before = await List(client);

        var reorder = await Reorder(client, parent.Id, firstChild.Id, secondChild.Id);

        reorder.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var after = await List(client);
        Children(after, parent.Id).Select(task => task.Id).Should().Equal(firstChild.Id, secondChild.Id);
        Children(after, parent.Id).Select(task => task.Position).Should().Equal(0, 1);
        Roots(after).Should().BeEquivalentTo(Roots(before), options => options.WithStrictOrdering());
        Children(after, otherParent.Id).Should().BeEquivalentTo(Children(before, otherParent.Id), options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task ReorderWithAMissingIdIsRejected()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var alpha = await CreateTask(client, "Alpha");
        await CreateTask(client, "Beta");
        var before = await List(client);

        var reorder = await Reorder(client, null, alpha.Id);

        reorder.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await List(client)).Should().BeEquivalentTo(before, options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task ReorderWithAnIdFromAnotherGroupIsRejected()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var alpha = await CreateTask(client, "Alpha");
        var beta = await CreateTask(client, "Beta");
        var child = await CreateTask(client, "Child", alpha.Id);

        var reorder = await Reorder(client, null, alpha.Id, beta.Id, child.Id);

        reorder.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ReorderWithADuplicateIdIsRejected()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var alpha = await CreateTask(client, "Alpha");
        await CreateTask(client, "Beta");

        var reorder = await Reorder(client, null, alpha.Id, alpha.Id);

        reorder.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ReorderWithAnEmptyListIsRejected()
    {
        var client = factory.ClientFor(Guid.NewGuid());

        var reorder = await Reorder(client, null);

        reorder.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ReorderWithAnotherUsersTaskIdsIsRejected()
    {
        var victimClient = factory.ClientFor(Guid.NewGuid());
        var victimFirst = await CreateTask(victimClient, "Victim first");
        var victimSecond = await CreateTask(victimClient, "Victim second");
        var victimBefore = await List(victimClient);
        var attackerClient = factory.ClientFor(Guid.NewGuid());

        var reorder = await Reorder(attackerClient, null, victimFirst.Id, victimSecond.Id);

        reorder.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await List(victimClient)).Should().BeEquivalentTo(victimBefore, options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task ReorderUnderAnotherUsersParentIsRejected()
    {
        var victimClient = factory.ClientFor(Guid.NewGuid());
        var victimParent = await CreateTask(victimClient, "Victim parent");
        var victimChild = await CreateTask(victimClient, "Victim child", victimParent.Id);
        var victimBefore = await List(victimClient);
        var attackerClient = factory.ClientFor(Guid.NewGuid());

        var reorder = await Reorder(attackerClient, victimParent.Id, victimChild.Id);

        reorder.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await List(victimClient)).Should().BeEquivalentTo(victimBefore, options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task ReorderAfterADeleteRenumbersTheGroupFromZero()
    {
        var client = factory.ClientFor(Guid.NewGuid());
        var alpha = await CreateTask(client, "Alpha");
        var beta = await CreateTask(client, "Beta");
        var gamma = await CreateTask(client, "Gamma");
        (await client.DeleteAsync($"/api/tasks/{beta.Id}")).EnsureSuccessStatusCode();

        var reorder = await Reorder(client, null, alpha.Id, gamma.Id);

        reorder.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var roots = Roots(await List(client));
        roots.Select(task => task.Id).Should().Equal(alpha.Id, gamma.Id);
        roots.Select(task => task.Position).Should().Equal(0, 1);
    }

    private static List<TaskDto> Roots(IEnumerable<TaskDto> tasks) =>
        [.. tasks.Where(task => task.ParentTaskId is null)];

    private static List<TaskDto> Children(IEnumerable<TaskDto> tasks, TaskId parentId) =>
        [.. tasks.Where(task => task.ParentTaskId == parentId)];

    private static async Task<List<TaskDto>> List(HttpClient client)
    {
        var tasks = await client.GetFromJsonAsync<List<TaskDto>>("/api/tasks");
        tasks.Should().NotBeNull();
        return tasks;
    }

    private static Task<HttpResponseMessage> Reorder(HttpClient client, TaskId? parentId, params TaskId[] orderedTaskIds) =>
        client.PutAsJsonAsync("/api/tasks/order", new ReorderTasksRequest(parentId, orderedTaskIds));

    private static async Task<TaskDto> CreateTask(HttpClient client, string name, TaskId? parentId = null)
    {
        var response = parentId is null
            ? await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest(name))
            : await client.PostAsJsonAsync($"/api/tasks/{parentId}/subtasks", new CreateSubtaskRequest(name));
        response.EnsureSuccessStatusCode();
        var task = await response.Content.ReadFromJsonAsync<TaskDto>();
        task.Should().NotBeNull();
        return task;
    }
}
