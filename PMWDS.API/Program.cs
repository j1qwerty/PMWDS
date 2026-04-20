using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;
using PMWDS.API.Hubs;
using PMWDS.API.Middleware;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Infrastructure.Settings;
using PMWDS.Infrastructure.Services;
using PMWDS.Persistence.Context;
using PMWDS.Persistence.Repositories;
using PMWDS.AI.Services;
using FluentValidation.AspNetCore;
using MediatR;
using AutoMapper;
var builder = WebApplication.CreateBuilder(args);
// ── Serilog ───────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
 .ReadFrom.Configuration(builder.Configuration)
 .Enrich.FromLogContext()
 .WriteTo.Console()
 .WriteTo.Seq(builder.Configuration
 .GetValue<string>("Seq:ServerUrl")
 ?? "http://localhost:5341")
 .CreateLogger();
builder.Host.UseSerilog();

// ── Configuration Binding ─────────────────────────────────
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

// ── Database ──────────────────────────────────────────────
builder.Services.AddDbContext<ApplicationDbContext>(opt =>
 opt.UseSqlServer(
 builder.Configuration.GetConnectionString("Default"),
 sql => sql.MigrationsAssembly(
 "PMWDS.Persistence")));

// ── Identity ──────────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(opt =>
{
    opt.Password.RequireDigit = true;
    opt.Password.RequireLowercase = true;
    opt.Password.RequireUppercase = true;
    opt.Password.RequireNonAlphanumeric = true;
    opt.Password.RequiredLength = 8;
    opt.Lockout.MaxFailedAccessAttempts = 5;
    opt.Lockout.DefaultLockoutTimeSpan =
    TimeSpan.FromMinutes(15);
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// ── JWT Authentication ────────────────────────────────────
var jwt = builder.Configuration
 .GetSection("Jwt").Get<JwtSettings>()!;
builder.Services
 .AddAuthentication(opt =>
 {
     opt.DefaultAuthenticateScheme =
     JwtBearerDefaults.AuthenticationScheme;
     opt.DefaultChallengeScheme =
     JwtBearerDefaults.AuthenticationScheme;
 })
 .AddJwtBearer(opt =>
 {
     opt.TokenValidationParameters =
     new TokenValidationParameters
     {
         ValidateIssuer = true,
         ValidateAudience = true,
         ValidateLifetime = true,
         ValidateIssuerSigningKey = true,
         ValidIssuer = jwt.Issuer,
         ValidAudience = jwt.Audience,
         IssuerSigningKey = new SymmetricSecurityKey(
     Encoding.UTF8.GetBytes(jwt.Secret)),
         ClockSkew = TimeSpan.Zero
     };
     // Allow JWT from SignalR query string
     opt.Events = new JwtBearerEvents
     {
         OnMessageReceived = ctx =>
         {
             var token = ctx.Request.Query["access_token"];
             var path = ctx.HttpContext.Request.Path;
             if (!string.IsNullOrEmpty(token)
     && path.StartsWithSegments("/hubs"))
                 ctx.Token = token;
             return Task.CompletedTask;
         }
     };
 });

// ── Authorization Policies ────────────────────────────────
builder.Services.AddAuthorization(opt =>
{
    opt.AddPolicy("SuperAdmin", p =>
    p.RequireRole("SuperAdmin"));
    opt.AddPolicy("Manager", p =>
    p.RequireRole("SuperAdmin", "ProjectManager",
    "DepartmentHead"));
    opt.AddPolicy("TeamLead", p =>
    p.RequireRole("SuperAdmin", "ProjectManager",
    "DepartmentHead", "TeamLead"));
    opt.AddPolicy("Authenticated", p =>
    p.RequireAuthenticatedUser());


});

// ── Application Services ──────────────────────────────────
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<ICurrentUserService,
 CurrentUserService>();
builder.Services.AddScoped<INotificationService,
 NotificationService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IFileStorageService,
 AzureBlobStorageService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddSingleton<ICacheService,
 RedisCacheService>();


// ── AI Services ───────────────────────────────────────────
builder.Services.AddScoped<ITaskAllocationEngine,
 MLTaskAllocationEngine>();
builder.Services.AddScoped<IDelayPredictionEngine,
 MLDelayPredictionEngine>();
builder.Services.AddScoped<IChatEngine, OpenAIChatEngine>();
builder.Services.AddScoped<IAIService, AIService>();

// ── MediatR ───────────────────────────────────────────────
builder.Services.AddMediatR(cfg =>
 cfg.RegisterServicesFromAssembly(
 typeof(PMWDS.Application.Features.Projects
 .Commands.CreateProjectCommandHandler)
 .Assembly));

// ── AutoMapper ────────────────────────────────────────────
builder.Services.AddAutoMapper(
 typeof(PMWDS.Application.Mappings.ProjectProfile)
 .Assembly);


// ── FluentValidation ──────────────────────────────────────
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssembly(
 typeof(PMWDS.Application.Validators
 .CreateProjectValidator).Assembly);

// ── Redis Cache ───────────────────────────────────────────
builder.Services.AddStackExchangeRedisCache(opt =>
{
    opt.Configuration = builder.Configuration
    .GetConnectionString("Redis");
    opt.InstanceName = "PMWDS:";
});

// ── Hangfire ──────────────────────────────────────────────
builder.Services.AddHangfire(cfg =>
 cfg.SetDataCompatibilityLevel(
 CompatibilityLevel.Version_180)
 .UseSimpleAssemblyNameTypeSerializer()
 .UseRecommendedSerializerSettings()
 .UseSqlServerStorage(
 builder.Configuration
 .GetConnectionString("Hangfire")));
builder.Services.AddHangfireServer();
// ── SignalR ───────────────────────────────────────────────
builder.Services.AddSignalR();
// ── HTTP Context ──────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
// ── Controllers + Swagger ─────────────────────────────────
builder.Services.AddControllers()
 .AddJsonOptions(opt =>
 {
     opt.JsonSerializerOptions
     .DefaultIgnoreCondition =
     System.Text.Json.Serialization
     .JsonIgnoreCondition.WhenWritingNull;
     opt.JsonSerializerOptions.Converters.Add(
     new System.Text.Json.Serialization
     .JsonStringEnumConverter());
 });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(opt =>
{
    opt.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "PMWDS API",
        Version = "v1",
        Description =
    "Project Monitoring & Work Distribution System",
        Contact = new OpenApiContact
        {
            Name = "PMWDS Team",
            Email = "support@pmwds.com"
        }
    });
    opt.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {token}"
    });
    opt.AddSecurityRequirement(new OpenApiSecurityRequirement
 {
 {
 new OpenApiSecurityScheme
 {
 Reference = new OpenApiReference
 {
 Type = ReferenceType.SecurityScheme,
 Id = "Bearer"
 }
 },
 Array.Empty<string>()
 }
 });
});

// ── CORS ──────────────────────────────────────────────────
builder.Services.AddCors(opt =>
 opt.AddPolicy("PMWDSCors", p =>
 p.WithOrigins(
 builder.Configuration
 .GetSection("AllowedOrigins")
 .Get<string[]>()
 ?? Array.Empty<string>())


 AllowAnyMethod()
 .AllowAnyHeader()
 .AllowCredentials()));


// ─────────────────────────────────────────────────────────
var app = builder.Build();
// ─────────────────────────────────────────────────────────

// ── Middleware Pipeline ───────────────────────────────────
app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(opt =>
    {
        opt.SwaggerEndpoint("/swagger/v1/swagger.json",
     "PMWDS API v1");
        opt.RoutePrefix = string.Empty;
    });
}
app.UseHttpsRedirection();
app.UseSerilogRequestLogging();
app.UseCors("PMWDSCors");
app.UseAuthentication();
app.UseAuthorization();


// ── Hangfire Dashboard ────────────────────────────────────
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[]
 {
 new HangfireAuthorizationFilter()
 }
});

// ── SignalR Hubs ──────────────────────────────────────────
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<DashboardHub>("/hubs/dashboard");

// ── Controllers ───────────────────────────────────────────
app.MapControllers();
// ── Recurring Jobs Setup ────────────────────────────────── 
using (var scope = app.Services.CreateScope())
{
    // DB Migration on startup
    var db = scope.ServiceProvider
    .GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();
    // Register recurring Hangfire jobs
    RecurringJob.AddOrUpdate<IDeadlineCheckerJob>(
    "deadline-checker",
    j => j.ExecuteAsync(CancellationToken.None),
    Cron.Hourly);
    RecurringJob.AddOrUpdate<IEscalationCheckerJob>(
    "escalation-checker",
    j => j.ExecuteAsync(CancellationToken.None),
    Cron.HourlyAt(30));
    RecurringJob.AddOrUpdate<IAIModelTrainingJob>(
    "ai-model-training",
    j => j.ExecuteAsync(CancellationToken.None),
    Cron.Daily(2)); // 2:00 AM daily
    RecurringJob.AddOrUpdate<IScheduledReportJob>(
    "scheduled-reports",
    j => j.ExecuteAsync(CancellationToken.None),
    Cron.Weekly(DayOfWeek.Monday, 7)); // Mon 7 AM
}
app.Run();