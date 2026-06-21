using System.Text.Json;
using System.Text.Json.Serialization;

namespace HabitTracker.Modules.Tasks.Contracts;

[JsonConverter(typeof(TaskIdJsonConverter))]
public readonly record struct TaskId(Guid Value)
{
    public static TaskId New() => new(Guid.CreateVersion7());

    public override string ToString() => Value.ToString();
}

/// Serializes <see cref="TaskId"/> as a bare GUID string, mirroring the EF value
/// converter that stores it as a bare uuid column.
public sealed class TaskIdJsonConverter : JsonConverter<TaskId>
{
    public override TaskId Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        new(reader.GetGuid());

    public override void Write(Utf8JsonWriter writer, TaskId value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.Value);
}
