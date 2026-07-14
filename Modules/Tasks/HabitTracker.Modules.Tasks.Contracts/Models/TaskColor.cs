namespace HabitTracker.Modules.Tasks.Contracts.Models;

/// <summary>
/// Bounded palette a task can be tagged with. Serialized as its integer value and stored as an
/// int column, so member values are fixed once shipped — reordering would remap existing rows.
/// The enum name → hex mapping for rendering lives in the frontend.
/// </summary>
public enum TaskColor
{
    Slate = 0,
    Red = 1,
    Orange = 2,
    Amber = 3,
    Green = 4,
    Teal = 5,
    Blue = 6,
    Violet = 7,
}
