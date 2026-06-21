using System.Text.Json;
using System.Text.Json.Serialization;

namespace HabitTracker.Modules.Tasks.Contracts;

[JsonConverter(typeof(TimeLogIdJsonConverter))]
public readonly record struct TimeLogId(Guid Value)
{
    public static TimeLogId New() => new(Guid.CreateVersion7());

    public override string ToString() => Value.ToString();
}

/// Serializes <see cref="TimeLogId"/> as a bare GUID string, mirroring the EF value
/// converter that stores it as a bare uuid column.
public sealed class TimeLogIdJsonConverter : JsonConverter<TimeLogId>
{
    public override TimeLogId Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        new(reader.GetGuid());

    public override void Write(Utf8JsonWriter writer, TimeLogId value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.Value);
}
