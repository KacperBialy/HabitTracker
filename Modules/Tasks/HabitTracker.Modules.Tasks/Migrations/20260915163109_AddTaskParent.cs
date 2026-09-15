using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HabitTracker.Modules.Tasks.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskParent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ParentTaskId",
                schema: "tasks",
                table: "Tasks",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ParentTaskId",
                schema: "tasks",
                table: "Tasks",
                column: "ParentTaskId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Tasks_ParentTaskId",
                schema: "tasks",
                table: "Tasks",
                column: "ParentTaskId",
                principalSchema: "tasks",
                principalTable: "Tasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Tasks_ParentTaskId",
                schema: "tasks",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_ParentTaskId",
                schema: "tasks",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "ParentTaskId",
                schema: "tasks",
                table: "Tasks");
        }
    }
}
