namespace PMWDS.Infrastructure.Settings;

public class EmailSettings
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public bool UseSsl { get; set; } = true;
}

public class AzureStorageSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string ContainerName { get; set; } = string.Empty;
    public string LocalUploadPath { get; set; } = string.Empty;
    public string LocalBaseUrl { get; set; } = "/files";
}

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 60;
}

public class AISettings
{
    public string OpenAIApiKey { get; set; } = string.Empty;
    public string OpenAIModel { get; set; } = "gpt-4o";
    public string DefaultProvider { get; set; } = "OpenAI";
    public string DefaultModel { get; set; } = string.Empty;
    public string AppName { get; set; } = "PMWDS";
    public string AppUrl { get; set; } = "http://localhost:5177";
    public string MLModelPath { get; set; } = string.Empty;
    public bool UseLocalModel { get; set; } = false;
    public double RiskThreshold { get; set; } = 0.7;
    public int TrainingCronHour { get; set; } = 2; // 2 AM
    public AIProviderOptions OpenAI { get; set; } = new()
    {
        Enabled = true,
        BaseUrl = "https://api.openai.com/v1",
        DefaultModel = "gpt-4o"
    };
    public AIProviderOptions OpenRouter { get; set; } = new()
    {
        Enabled = false,
        BaseUrl = "https://openrouter.ai/api/v1",
        DefaultModel = "openai/gpt-4o-mini"
    };
}

public class AIProviderOptions
{
    public bool Enabled { get; set; } = false;
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public string DefaultModel { get; set; } = string.Empty;
    public string ModelsPath { get; set; } = "/models";
    public Dictionary<string, string> Headers { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public class HangfireSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DashboardPath { get; set; } = "/hangfire";
}

public class DatabaseSettings
{
    public bool EnableSqliteFallback { get; set; } = true;
    public bool ForceSqlite { get; set; } = false;
    public string SqliteConnectionString { get; set; } = "Data Source=App_Data/pmwds-dev.sqlite";
}
