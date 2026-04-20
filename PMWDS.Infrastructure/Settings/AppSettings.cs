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
    public string OpenAIModel { get; set; } = "gpt-4";
    public string MLModelPath { get; set; } = string.Empty;
    public bool UseLocalModel { get; set; } = false;
    public double RiskThreshold { get; set; } = 0.7;
    public int TrainingCronHour { get; set; } = 2; // 2 AM
}

public class HangfireSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DashboardPath { get; set; } = "/hangfire";
}