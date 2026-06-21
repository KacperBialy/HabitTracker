using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HabitTracker.IntegrationTests.Configurations;
using HabitTracker.Modules.Tasks.Contracts.Requests;

namespace HabitTracker.IntegrationTests;

[Collection(ApiCollection.Name)]
public sealed class SpaAndSerializationTests(ApiFactory factory)
{
    [Fact]
    public async Task TaskIdSerializesAsABareGuidStringNotAWrapperObject()
    {
        var client = factory.ClientFor(Guid.NewGuid());

        var create = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest("Stretch"));
        var json = await create.Content.ReadAsStringAsync();

        json.Should().MatchRegex("\"id\"\\s*:\\s*\"[0-9a-fA-F-]{36}\"");
        json.Should().NotContain("\"value\"");
    }

    [Fact]
    public async Task RootServesTheAngularShell()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/");
        var body = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body.Should().Contain("<app-root>");
    }

    [Fact]
    public async Task UnknownClientRouteFallsBackToTheShell()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/unknown");
        var body = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body.Should().Contain("<app-root>");
    }

    [Fact]
    public async Task LoginRouteFallsBackToTheShellNotTheOidcChallenge()
    {
        // /login is the Angular page; the OIDC challenge lives at /api/auth/login.
        var client = factory.CreateClient();

        var response = await client.GetAsync("/login");
        var body = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body.Should().Contain("<app-root>");
    }
}
