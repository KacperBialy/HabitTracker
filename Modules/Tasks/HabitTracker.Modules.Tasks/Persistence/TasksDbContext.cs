using HabitTracker.Modules.Tasks.Contracts;
using HabitTracker.Modules.Tasks.Domain;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Modules.Tasks.Persistence;

internal sealed class TasksDbContext(DbContextOptions<TasksDbContext> options) : DbContext(options)
{
    public const string Schema = "tasks";

    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    public DbSet<TimeLogEntry> TimeLogs => Set<TimeLogEntry>();

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

        modelBuilder.Entity<TimeLogEntry>(b =>
        {
            b.ToTable("TimeLogs");
            b.HasKey(l => l.Id);

            b.Property(l => l.Id)
                .HasConversion(id => id.Value, value => new TimeLogId(value))
                .ValueGeneratedNever();

            b.Property(l => l.TaskId)
                .HasConversion(id => id.Value, value => new TaskId(value));

            b.Property(l => l.OwnerId).IsRequired();
            b.Property(l => l.Minutes).IsRequired();
            b.Property(l => l.LogDate).IsRequired();

            b.HasOne<TaskItem>()
                .WithMany()
                .HasForeignKey(l => l.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasIndex(l => l.TaskId);
            b.HasIndex(l => l.OwnerId);
        });
    }
}
