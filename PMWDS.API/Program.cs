using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PMWDS.API.Hubs;
using PMWDS.API.Middleware;
using PMWDS.API.Services;
using PMWDS.AI.Models;
using PMWDS.AI.Services;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Infrastructure.Jobs;
using PMWDS.Infrastructure.Services;
using PMWDS.Infrastructure.Settings;
using PMWDS.Persistence.Context;
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
builder.Services.Configure<PMWDS.AI.Models.AISettings>(
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

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IFileStorageService, AzureBlobStorageService>();
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IAuditService, AuditService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddSingleton<PMWDS.Application.Interfaces.Services.ICacheService, RedisCacheService>();
builder.Services.AddScoped<IBackgroundJobService, HangfireBackgroundJobService>();
builder.Services.AddScoped<IDeadlineCheckerJob, DeadlineCheckerJob>();
builder.Services.AddScoped<IAIModelTrainingJob, AIModelTrainingJob>();
builder.Services.AddScoped<IScheduledReportJob, ScheduledReportJob>();
builder.Services.AddScoped<IEscalationCheckerJob, EscalationCheckerJob>();

builder.Services.AddScoped<ITaskAllocationEngine, MLTaskAllocationEngine>();
builder.Services.AddScoped<IDelayPredictionEngine, MLDelayPredictionEngine>();
builder.Services.AddScoped<IChatEngine, OpenAIChatEngine>();
builder.Services.AddScoped<IAIService, AIService>();

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
builder.Services.AddControllers();
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
app.UseHangfireDashboard("/hangfire");

app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<DashboardHub>("/hubs/dashboard");
app.MapControllers();

app.Run();
