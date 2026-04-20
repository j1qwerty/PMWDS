using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace PMWDS.API.Controllers;
public class NotificationsController : BaseApiController
{
 [HttpGet]
 [Authorize(Policy = "Authenticated")]
 public IActionResult GetMine()
 => StatusCode(StatusCodes.Status501NotImplemented);
}
