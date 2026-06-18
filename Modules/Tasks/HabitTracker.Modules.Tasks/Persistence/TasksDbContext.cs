using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Domain;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Modules.Tasks.Persistence;

internal sealed class TasksDbContext(DbContextOptions<TasksDbContext> options) : DbContext(options)
{
    public const string Schema = "tasks";

    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.Entity<TaskItem>(b =>
        {
            b.ToTable("Tasks");
            b.HasKey(t => t.Id);

            b.Property(t => t.Id)
                .HasConversion(id => id.Value, value => new TaskId(value))
                .ValueGeneratedNever();

            b.Property(t => t.OwnerId).IsRequired();
            b.Property(t => t.Name).IsRequired().HasMaxLength(200);
            b.Property(t => t.CreatedAt).IsRequired();

            b.HasIndex(t => t.OwnerId);
        });
    }
}
