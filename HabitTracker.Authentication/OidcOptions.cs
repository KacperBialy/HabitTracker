namespace HabitTracker.Authentication;

public sealed class OidcOptions
{
    public const string SectionName = "Oidc";

    public string Authority { get; init; } = string.Empty;
    public string ClientId { get; init; } = string.Empty;
    public string ClientSecret { get; init; } = string.Empty;
}