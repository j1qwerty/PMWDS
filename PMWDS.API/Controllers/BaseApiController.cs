using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace PMWDS.API.Controllers;
[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[Produces("application/json")]
public abstract class BaseApiController : ControllerBase
{
 private IMediator? _mediator;
 protected IMediator Mediator =>
 _mediator ??= HttpContext.RequestServices
 .GetRequiredService<IMediator>();
 protected IActionResult HandleResult<T>(T result)
 => result is null
 ? NotFound()
 : Ok(result);
}
