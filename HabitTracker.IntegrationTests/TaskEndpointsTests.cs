using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HabitTracker.IntegrationTests.Configurations;
using HabitTracker.Modules.Tasks.Contracts.Models;
using HabitTracker.Modules.Tasks.Contracts.Requests;

namespace HabitTracker.IntegrationTests;

[Collection(ApiCollection.Name)]
public sealed class TaskEndpointsTests(ApiFactory factory)
{
    [Fact]
    public async Task CreatingATaskMakesItAppearInTheOwnersList()
    {
        var owner = Guid.NewGuid();
        var client = factory.ClientFor(owner);

        var create = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest("Drink water"));
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await create.Content.ReadFromJsonAsync<TaskDto>();
        created.Should().NotBeNull();
        created.Name.Should().Be("Drink water");
        created.OwnerId.Should().Be(owner);

        var list = await client.GetFromJsonAsync<List<TaskDto>>("/api/tasks");

        list.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(created);
    }

    [Fact]
    public async Task TasksAreScopedToTheirOwner()
    {
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();

        var ownerClient = factory.ClientFor(owner);
        await ownerClient.PostAsJsonAsync("/api/tasks", new CreateTaskRequest("Owner task"));

        var otherList = await factory.ClientFor(other)
            .GetFromJsonAsync<List<TaskDto>>("/api/tasks");

        otherList.Should().NotBeNull();
        otherList.Should().BeEmpty();
    }

    [Fact]
    public async Task DeletingATaskRemovesItFromTheList()
    {
        var client = factory.ClientFor(Guid.NewGuid());

        var create = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest("Throwaway"));
        var created = await create.Content.ReadFromJsonAsync<TaskDto>();
        created.Should().NotBeNull();

        var delete = await client.DeleteAsync($"/api/tasks/{created.Id}");

        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var list = await client.GetFromJsonAsync<List<TaskDto>>("/api/tasks");
        list.Should().BeEmpty();
    }

    [Fact]
    public async Task DeletingAnotherUsersTaskIsRejected()
    {
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();

        var create = await factory.ClientFor(owner)
            .PostAsJsonAsync("/api/tasks", new CreateTaskRequest("Owner task"));
        var created = await create.Content.ReadFromJsonAsync<TaskDto>();
        created.Should().NotBeNull();

        var delete = await factory.ClientFor(other)
            .DeleteAsync($"/api/tasks/{created.Id}");

        delete.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var ownerList = await factory.ClientFor(owner)
            .GetFromJsonAsync<List<TaskDto>>("/api/tasks");

        ownerList.Should().Contain(t => t.Id == created.Id);
    }

    [Fact]
    public async Task RequestsWithoutAuthenticationAreRejected()
    {
        var client = factory.AnonymousClient();

        var response = await client.GetAsync("/api/tasks");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
