using HabitTracker.Modules.Tasks.Application;
using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HabitTracker.Modules.Tasks;

public static class TasksModule
{
    public static IServiceCollection AddTasksModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Tasks") ?? throw new InvalidOperationException("Missing connection string 'Tasks'.");

        services.AddDbContext<TasksDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
                npgsql.MigrationsHistoryTable("__EFMigrationsHistory", TasksDbContext.Schema)));

        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<ITaskTimeLogService, TaskTimeLogService>();

        return services;
    }
}
