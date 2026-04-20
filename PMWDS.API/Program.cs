using AutoMapper;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using Hangfire.Dashboard;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PMWDS.API.Hubs;
using PMWDS.API.Middleware;
using PMWDS.API.Services;
using PMWDS.API.Filters;
using PMWDS.AI.Services;
using PMWDS.Infrastructure.Jobs;
using PMWDS.Infrastructure.Services;
using PMWDS.Infrastructure.Settings;
using PMWDS.Persistence.Context;
using PMWDS.Persistence.Migrations;
using PMWDS.Persistence.Repositories;
using Serilog;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<EmailSettings>(
    builder.Configuration.GetSection("Email"));
builder.Services.Configure<AzureStorageSettings>(
    builder.Configuration.GetSection("AzureStorage"));
builder.Services.Configure<AISettings>(
    builder.Configuration.GetSection("AI"));
builder.Services.Configure<HangfireSettings>(
    builder.Configuration.GetSection("Hangfire"));

builder.Services.AddDbContext<ApplicationDbContext>(opt =>
    opt.UseSqlServer(
        builder.Configuration.GetConnectionString("Default"),
        sql => sql.MigrationsAssembly("PMWDS.Persistence")));

var jwt = builder.Configuration
    .GetSection("Jwt")
    .Get<JwtSettings>() ?? new JwtSettings();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt.Secret ?? string.Empty)),
            ClockSkew = TimeSpan.Zero
        };
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                var path = ctx.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(token) && path.StartsWithSegments("/hubs"))
                {
                    ctx.Token = token;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(opt =>
{
    opt.AddPolicy("SuperAdmin", p => p.RequireRole("SuperAdmin"));
    opt.AddPolicy("Manager", p => p.RequireRole("SuperAdmin", "ProjectManager", "DepartmentHead"));
    opt.AddPolicy("TeamLead", p => p.RequireRole("SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"));
    opt.AddPolicy("Authenticated", p => p.RequireAuthenticatedUser());
});

builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.INotificationService, NotificationService>();
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IEmailService, EmailService>();
builder.Services.AddScoped<PMWDS.Infrastructure.Services.IFileStorageService, AzureBlobStorageService>();
builder.Services.AddScoped<PMWDS.Infrastructure.Services.AuditService>();
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IAuditService>(sp =>
    sp.GetRequiredService<PMWDS.Infrastructure.Services.AuditService>());
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IReportService, ReportService>();
builder.Services.AddSingleton<PMWDS.Infrastructure.Services.RedisCacheService>();
builder.Services.AddSingleton<PMWDS.Application.Interfaces.Services.ICacheService>(sp =>
    sp.GetRequiredService<PMWDS.Infrastructure.Services.RedisCacheService>());

builder.Services.AddScoped<ITaskAllocationEngine, MLTaskAllocationEngine>();
builder.Services.AddScoped<IDelayPredictionEngine, MLDelayPredictionEngine>();
builder.Services.AddScoped<IChatEngine, OpenAIChatEngine>();
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IAIService, AIService>();

builder.Services.AddScoped<IDeadlineCheckerJob, DeadlineCheckerJob>();
builder.Services.AddScoped<IEscalationCheckerJob, EscalationCheckerJob>();
builder.Services.AddScoped<IAIModelTrainingJob, AIModelTrainingJob>();
builder.Services.AddScoped<IScheduledReportJob, ScheduledReportJob>();

builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssemblyContaining<
        PMWDS.Application.Features.Projects.Commands.CreateProjectCommand>());
builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

builder.Services.AddStackExchangeRedisCache(opt =>
{
    opt.Configuration = builder.Configuration.GetConnectionString("Redis");
    opt.InstanceName = "PMWDS:";
});

builder.Services.AddHangfire(cfg =>
    cfg.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
       .UseSimpleAssemblyNameTypeSerializer()
       .UseRecommendedSerializerSettings()
       .UseSqlServerStorage(builder.Configuration.GetConnectionString("Hangfire")));
builder.Services.AddHangfireServer();

builder.Services.AddSignalR();
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers().AddJsonOptions(opt =>
{
    opt.JsonSerializerOptions.DefaultIgnoreCondition =
        System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    opt.JsonSerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(opt =>
    opt.AddPolicy("PMWDSCors", p =>
        p.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
         .AllowAnyMethod()
         .AllowAnyHeader()
         .AllowCredentials()));

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseSerilogRequestLogging();
app.UseCors("PMWDSCors");
app.UseAuthentication();
app.UseAuthorization();
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthorizationFilter() }
});

app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<DashboardHub>("/hubs/dashboard");
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();
    await SeedData.SeedAsync(db);

    RecurringJob.AddOrUpdate<IDeadlineCheckerJob>(
        "deadline-checker",
        j => j.ExecuteAsync(CancellationToken.None),
        Cron.Hourly);
    RecurringJob.AddOrUpdate<IEscalationCheckerJob>(
        "escalation-checker",
        j => j.ExecuteAsync(CancellationToken.None),
        Cron.Hourly(30));
    RecurringJob.AddOrUpdate<IAIModelTrainingJob>(
        "ai-model-training",
        j => j.ExecuteAsync(CancellationToken.None),
        Cron.Daily(2));
    RecurringJob.AddOrUpdate<IScheduledReportJob>(
        "scheduled-reports",
        j => j.ExecuteAsync(CancellationToken.None),
        Cron.Weekly(DayOfWeek.Monday, 7));
}

app.Run();
