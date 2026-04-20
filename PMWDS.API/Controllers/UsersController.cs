using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.Features.Users.Queries;
namespace PMWDS.API.Controllers;
public class UsersController : BaseApiController
{
 [HttpGet("workload")]
 [Authorize(Policy = "Manager")]
 public async Task<IActionResult> GetWorkload(
 [FromQuery] Guid? departmentId,
 CancellationToken ct)
 => HandleResult(await Mediator.Send(
 new GetWorkloadDistributionQuery(
 departmentId), ct));
}
