namespace HabitTracker.IntegrationTests.Configurations;

/// <summary>
/// Groups all integration tests so they share a single <see cref="ApiFactory"/>
/// (one Postgres container + one host) for the whole test run.
/// Apply with <c>[Collection(ApiCollection.Name)]</c> on each test class.
/// </summary>
[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
