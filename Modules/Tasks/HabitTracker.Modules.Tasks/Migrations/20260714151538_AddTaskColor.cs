using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HabitTracker.Modules.Tasks.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Color",
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
                name: "Color",
                schema: "tasks",
                table: "Tasks");
        }
    }
}
