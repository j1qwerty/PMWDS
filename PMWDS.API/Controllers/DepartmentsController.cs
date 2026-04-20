using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace PMWDS.API.Controllers;
public class DepartmentsController : BaseApiController
{
 [HttpGet]
 [Authorize(Policy = "Authenticated")]
 public IActionResult GetAll()
 => StatusCode(StatusCodes.Status501NotImplemented);
 [HttpGet("{id:guid}")]
 [Authorize(Policy = "Authenticated")]
 public IActionResult GetById(Guid id)
 => StatusCode(StatusCodes.Status501NotImplemented);
}
