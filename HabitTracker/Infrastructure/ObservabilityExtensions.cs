using HabitTracker.SharedKernel.Observability;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;

namespace HabitTracker.Infrastructure;

public static class ObservabilityExtensions
{
    public const string ServiceName = "HabitTracker";

    public static IServiceCollection AddObservability(this IServiceCollection services)
    {
        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(ServiceName))
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation()
                .AddMeter("Microsoft.EntityFrameworkCore")
                .AddMeter("Npgsql")
                .AddMeter(HabitTrackerMetrics.MeterName)
                .AddPrometheusExporter());

        return services;
    }
}
