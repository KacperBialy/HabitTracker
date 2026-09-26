using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HabitTracker.Modules.Tasks.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskPosition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Position",
                schema: "tasks",
                table: "Tasks",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Position",
                schema: "tasks",
                table: "Tasks");
        }
    }
}
