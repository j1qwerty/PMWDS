using AspNetCoreRateLimit;
using AutoMapper;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using Hangfire.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using PMWDS.API.Auth;
using PMWDS.API.Hubs;
using PMWDS.API.Middleware;
using PMWDS.API.Services;
using PMWDS.API.Filters;
using PMWDS.AI.Services;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Infrastructure.Jobs;
using PMWDS.Infrastructure.Services;
using PMWDS.Infrastructure.Settings;
using PMWDS.Persistence.Context;
using PMWDS.Persistence.Migrations;
using PMWDS.Persistence.Repositories;
using Serilog;
using System.Security.Claims;
using System.Text;
using Scalar.AspNetCore;

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;


var builder = WebApplication.CreateBuilder(args);
EnvFileLoader.Load(builder.Environment.ContentRootPath);
builder.Configuration.AddEnvironmentVariables();

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
builder.Services.Configure<DatabaseSettings>(
    builder.Configuration.GetSection("Database"));
builder.Services.Configure<LocalFileStorageSettings>(
    builder.Configuration.GetSection("FileStorage"));

// Rate limiting — IP-based, using Redis when available, in-memory otherwise
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.Configure<IpRateLimitPolicies>(
    builder.Configuration.GetSection("IpRateLimitPolicies"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddMemoryCache(); // Required by AspNetCoreRateLimit
builder.Services.AddDataProtection();
builder.Services.AddScoped<ILoginLockoutService, LoginLockoutService>();

var databaseStatus = builder.Services.AddApplicationDatabase(builder.Configuration, builder.Environment);

var jwt = builder.Configuration
    .GetSection("Jwt")
    .Get<JwtSettings>() ?? new JwtSettings();

var jwtSecretBytes = Encoding.UTF8.GetBytes(jwt.Secret ?? string.Empty);

// Fail fast if JWT secret is missing or weaker than 256 bits.
if (jwtSecretBytes.Length < 32)
{
    Console.WriteLine("[PMWDS] FATAL: Jwt:Secret must be a random secret with at least 32 bytes. Set it via environment variable, User Secrets, or .env file.");
    return;
}

if (jwt.ExpiryMinutes is < 15 or > 1440)
{
    Console.WriteLine("[PMWDS] FATAL: Jwt:ExpiryMinutes must be between 15 minutes and 24 hours (1440 minutes).");
    return;
}

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
            IssuerSigningKey = new SymmetricSecurityKey(jwtSecretBytes),
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
            },
            OnTokenValidated = async ctx =>
            {
                var userIdClaim = ctx.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                var tokenVersionClaim = ctx.Principal?.FindFirstValue("token_version");
                if (!Guid.TryParse(userIdClaim, out var userId) ||
                    !int.TryParse(tokenVersionClaim, out var tokenVersion))
                {
                    ctx.Fail("Invalid token claims.");
                    return;
                }

                var db = ctx.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
                var user = await db.Users
                    .AsNoTracking()
                    .Where(u => u.Id == userId)
                    .Select(u => new { u.IsActive, u.AccessTokenVersion })
                    .FirstOrDefaultAsync(ctx.HttpContext.RequestAborted);

                if (user == null || !user.IsActive || user.AccessTokenVersion != tokenVersion)
                {
                    ctx.Fail("Token has been revoked.");
                }
            }
        };
    });

builder.Services.AddAuthorization(PermissionPolicyRegistry.AddPolicies);
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<RoleScopeService>();
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.INotificationService, NotificationService>();
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IEmailService, EmailService>();
builder.Services.AddSingleton<ISensitiveDataProtector, SensitiveDataProtector>();
builder.Services.AddScoped<PMWDS.Infrastructure.Services.IFileStorageService, AzureBlobStorageService>();
builder.Services.AddScoped<PMWDS.Infrastructure.Services.ILocalFileStorageService, LocalFileStorageService>();
builder.Services.AddScoped<PMWDS.Infrastructure.Services.AuditService>();
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IAuditService>(sp =>
    sp.GetRequiredService<PMWDS.Infrastructure.Services.AuditService>());
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IReportService, ReportService>();
builder.Services.AddSingleton<PMWDS.Infrastructure.Services.IReportPdfRenderer, PMWDS.Infrastructure.Services.ReportPdfRenderer>();
builder.Services.AddSingleton<PMWDS.Infrastructure.Services.IReportExcelRenderer, PMWDS.Infrastructure.Services.ReportExcelRenderer>();
builder.Services.AddSingleton<PMWDS.Infrastructure.Services.RedisCacheService>();
builder.Services.AddSingleton<PMWDS.Application.Interfaces.Services.ICacheService>(sp =>
    sp.GetRequiredService<PMWDS.Infrastructure.Services.RedisCacheService>());

builder.Services.AddScoped<ITaskAllocationEngine, MLTaskAllocationEngine>();
builder.Services.AddScoped<IDelayPredictionEngine, MLDelayPredictionEngine>();
builder.Services.AddHttpClient<IChatEngine, OpenAICompatibleChatEngine>();
builder.Services.AddScoped<AIService>();
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IRecommendationService>(sp =>
    sp.GetRequiredService<AIService>());
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IPredictionService>(sp =>
    sp.GetRequiredService<AIService>());
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IProjectHealthService>(sp =>
    sp.GetRequiredService<AIService>());
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IModelManagementService>(sp =>
    sp.GetRequiredService<AIService>());
builder.Services.AddScoped<PMWDS.Application.Interfaces.Services.IChatService>(sp =>
    sp.GetRequiredService<AIService>());

builder.Services.AddScoped<IDeadlineCheckerJob, DeadlineCheckerJob>();
builder.Services.AddScoped<IEscalationCheckerJob, EscalationCheckerJob>();
builder.Services.AddScoped<IAIModelTrainingJob, AIModelTrainingJob>();
builder.Services.AddScoped<IScheduledReportJob, ScheduledReportJob>();

builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssemblyContaining<
        PMWDS.Application.Features.Projects.Commands.CreateProjectCommand>());
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<
    PMWDS.Application.Validators.LoginRequestValidator>();
builder.Services.AddAutoMapper(cfg =>
    cfg.AddMaps(AppDomain.CurrentDomain.GetAssemblies()));

var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrWhiteSpace(redisConnectionString))
{
    try
    {
        using var redis = StackExchange.Redis.ConnectionMultiplexer.Connect(redisConnectionString);
        if (redis.IsConnected)
        {
            Console.WriteLine($"[PMWDS] Redis connected ({redisConnectionString}).");
        }
        else
        {
            Console.WriteLine($"[PMWDS] WARNING: Redis at {redisConnectionString} is not reachable. Caching will fall back to in-memory.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[PMWDS] WARNING: Redis connection failed ({redisConnectionString}): {ex.Message}. Caching will fall back to in-memory.");
    }
}
builder.Services.AddStackExchangeRedisCache(opt =>
{
    opt.Configuration = redisConnectionString;
    opt.InstanceName = "PMWDS:";
});

if (databaseStatus.Provider == ActiveDatabaseProvider.SqlServer)
{
    builder.Services.AddHangfire(cfg =>
        cfg.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
           .UseSimpleAssemblyNameTypeSerializer()
           .UseRecommendedSerializerSettings()
           .UseSqlServerStorage(builder.Configuration.GetConnectionString("Hangfire")));
    builder.Services.AddHangfireServer();
}

builder.Services.AddSignalR();
builder.Services.AddHttpContextAccessor();
builder.Services
    .AddControllers(options => options.Filters.Add<ApiResponseEnvelopeFilter>())
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        opt.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        opt.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var details = context.ModelState
            .Where(entry => entry.Value?.Errors.Count > 0)
            .ToDictionary(
                entry => entry.Key,
                entry => entry.Value!.Errors.Select(error => error.ErrorMessage).ToArray());

        var response = PMWDS.Application.DTOs.Common.ApiResponse<object>.Fail(
            new PMWDS.Application.DTOs.Common.ApiError("validation_failed", "Validation failed.", details),
            context.HttpContext.TraceIdentifier);

        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(response);
    };
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
app.UseIpRateLimiting();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.MapScalarApiReference(options => options.WithOpenApiRoutePattern("/swagger/v1/swagger.json"));
}

app.UseHttpsRedirection();
var storageSettings = builder.Configuration.GetSection("AzureStorage").Get<AzureStorageSettings>() ?? new AzureStorageSettings();
var localFilesRoot = string.IsNullOrWhiteSpace(storageSettings.LocalUploadPath)
    ? Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Data"))
    : Directory.GetParent(storageSettings.LocalUploadPath)?.FullName ?? storageSettings.LocalUploadPath;
Directory.CreateDirectory(localFilesRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(localFilesRoot),
    RequestPath = storageSettings.LocalBaseUrl ?? "/files"
});
var fileStorageSettings = builder.Configuration.GetSection("FileStorage").Get<LocalFileStorageSettings>() ?? new LocalFileStorageSettings();
var avatarsRoot = string.IsNullOrWhiteSpace(fileStorageSettings.BasePath)
    ? Path.Combine(AppContext.BaseDirectory, "App_Data", "avatars")
    : Path.Combine(fileStorageSettings.BasePath, "avatars");
Directory.CreateDirectory(avatarsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(avatarsRoot),
    RequestPath = "/avatars"
});
app.UseSerilogRequestLogging();
app.UseCors("PMWDSCors");
app.UseAuthentication();
app.UseAuthorization();
if (databaseStatus.Provider == ActiveDatabaseProvider.SqlServer)
{
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = new[] { new HangfireAuthorizationFilter() }
    });
}

app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<DashboardHub>("/hubs/dashboard");
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await DatabaseConnectionService.PrepareDatabaseAsync(db, databaseStatus, builder.Environment);
    await SeedData.SeedAsync(db);
    await SensitiveDataMigrationService.ProtectExistingAsync(
        db,
        scope.ServiceProvider.GetRequiredService<ISensitiveDataProtector>());

    if (databaseStatus.Provider == ActiveDatabaseProvider.SqlServer)
    {
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
}

app.Run();
