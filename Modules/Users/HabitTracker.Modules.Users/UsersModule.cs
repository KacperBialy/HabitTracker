using HabitTracker.Modules.Users.Application;
using HabitTracker.Modules.Users.Contracts;
using HabitTracker.Modules.Users.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HabitTracker.Modules.Users;

public static class UsersModule
{
    public static IServiceCollection AddUsersModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Users")
                               ?? configuration.GetConnectionString("Default")
                               ?? throw new InvalidOperationException(
                                   "Missing connection string 'Users' (or 'Default').");

        services.AddDbContext<UsersDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
                npgsql.MigrationsHistoryTable("__EFMigrationsHistory", UsersDbContext.Schema)));

        services.AddScoped<IUserService, UserService>();

        return services;
    }

    public static async Task MigrateUsersModuleAsync(this IServiceProvider serviceProvider)
    {
        await using var scope = serviceProvider.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<UsersDbContext>();
        await dbContext.Database.MigrateAsync();
    }
}
