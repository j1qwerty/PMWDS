using MediatR;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.Application.Features.AI.Commands;


public record TriggerAITrainingCommand()
 : IRequest<bool>;
public class TriggerAITrainingCommandHandler
 : IRequestHandler<TriggerAITrainingCommand, bool>
{
 private readonly IAIService _aiService;
 public TriggerAITrainingCommandHandler(
 IAIService aiService)
 => _aiService = aiService;
 public async Task<bool> Handle(
 TriggerAITrainingCommand req,
 CancellationToken ct)
 {
 await _aiService.TrainModelsAsync(ct);
 return true;
 }
}
