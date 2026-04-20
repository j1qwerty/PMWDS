using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace PMWDS.API.Controllers;
public class MilestonesController : BaseApiController
{
 [HttpGet("by-project/{projectId:guid}")]
 [Authorize(Policy = "Authenticated")]
 public IActionResult GetByProject(Guid projectId)
 => StatusCode(StatusCodes.Status501NotImplemented);
 [HttpGet("{id:guid}")]
 [Authorize(Policy = "Authenticated")]
 public IActionResult GetById(Guid id)
 => StatusCode(StatusCodes.Status501NotImplemented);
}
