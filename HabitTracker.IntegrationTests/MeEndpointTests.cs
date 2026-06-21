using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HabitTracker.IntegrationTests.Configurations;

namespace HabitTracker.IntegrationTests;

[Collection(ApiCollection.Name)]
public sealed class MeEndpointTests(ApiFactory factory)
{
    private sealed record MeResponse(Guid Id);

    [Fact]
    public async Task ReturnsTheAuthenticatedUserId()
    {
        var userId = Guid.NewGuid();
        var client = factory.ClientFor(userId);

        var response = await client.GetAsync("/api/me");
        var body = await response.Content.ReadFromJsonAsync<MeResponse>();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body!.Id.Should().Be(userId);
    }

    [Fact]
    public async Task ReturnsUnauthorizedWhenAnonymous()
    {
        var client = factory.AnonymousClient();

        var response = await client.GetAsync("/api/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
