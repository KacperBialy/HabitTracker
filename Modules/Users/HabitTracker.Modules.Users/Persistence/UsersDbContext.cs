using HabitTracker.Modules.Users.Contracts;
using HabitTracker.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Modules.Users.Persistence;

internal sealed class UsersDbContext(DbContextOptions<UsersDbContext> options) : DbContext(options)
{
    public const string Schema = "users";

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.Entity<User>(b =>
        {
            b.ToTable("Users");
            b.HasKey(u => u.Id);

            b.Property(u => u.Id)
                .HasConversion(id => id.Value, value => new UserId(value))
                .ValueGeneratedNever();

            b.Property(u => u.Subject).IsRequired().HasMaxLength(256);
            b.Property(u => u.Email).IsRequired().HasMaxLength(320);
            b.Property(u => u.DisplayName).IsRequired().HasMaxLength(256);
            b.Property(u => u.CreatedAt).IsRequired();
            b.Property(u => u.LastLoginAt).IsRequired();

            b.HasIndex(u => u.Subject).IsUnique();
            b.HasIndex(u => u.Email).IsUnique();
        });
    }
}
