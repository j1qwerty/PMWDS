using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PMWDS.AI.Services;
using PMWDS.Infrastructure.Settings;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<AISettings>(
    builder.Configuration.GetSection("AI"));

builder.Services.AddSingleton<ITaskAllocationEngine, MLTaskAllocationEngine>();
builder.Services.AddSingleton<IDelayPredictionEngine, MLDelayPredictionEngine>();
builder.Services.AddSingleton<IChatEngine, OpenAIChatEngine>();
builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapHealthChecks("/health");
app.MapGet("/", () => "PMWDS.AI Service is running.");

app.Run();
