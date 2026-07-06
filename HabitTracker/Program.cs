using HabitTracker.Authentication;
using HabitTracker.Authentication.Endpoints;
using HabitTracker.Endpoints;
using HabitTracker.Infrastructure;
using HabitTracker.Modules.Tasks;
using HabitTracker.Modules.Users;
using HabitTracker.SharedKernel.Events;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddOidcAuthentication(builder.Configuration);

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
builder.Services.AddUsersModule(builder.Configuration);
builder.Services.AddTasksModule(builder.Configuration);

var app = builder.Build();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();
app.MapMeEndpoints();
app.MapTaskEndpoints();

// SPA fallback: any non-API, non-file route returns the Angular shell and lets its router take over.
// Mapped last so it never shadows /api/* or the auth endpoints above.
app.MapFallbackToFile("index.html");

app.Run();