namespace PMWDS.AI.Models;
public class AISettings
{
 public string OpenAIApiKey { get; set; } = string.Empty;
 public string OpenAIModel { get; set; } = "gpt-4o-mini";
 public string MLModelPath { get; set; } = string.Empty;
 public double RiskThreshold { get; set; } = 0.7;
}
