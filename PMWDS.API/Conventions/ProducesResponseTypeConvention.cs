using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using PMWDS.Application.DTOs.Common;

namespace PMWDS.API.Conventions;

public sealed class ProducesResponseTypeConvention : IApplicationModelConvention
{
    public void Apply(ApplicationModel application)
    {
        foreach (var controller in application.Controllers)
        {
            foreach (var action in controller.Actions)
            {
                AddIfMissing(action, StatusCodes.Status200OK);
                AddIfMissing(action, StatusCodes.Status400BadRequest);
                AddIfMissing(action, StatusCodes.Status401Unauthorized);
                AddIfMissing(action, StatusCodes.Status403Forbidden);
                AddIfMissing(action, StatusCodes.Status404NotFound);
                AddIfMissing(action, StatusCodes.Status500InternalServerError);

                if (action.Selectors.Any(selector => selector.EndpointMetadata.OfType<HttpGetAttribute>().Any()) &&
                    !action.Filters.OfType<ResponseCacheAttribute>().Any())
                {
                    action.Filters.Add(new ResponseCacheAttribute
                    {
                        Duration = 30,
                        Location = ResponseCacheLocation.Client,
                        VaryByQueryKeys = new[] { "*" }
                    });
                }
            }
        }
    }

    private static void AddIfMissing(ActionModel action, int statusCode)
    {
        if (action.Filters.OfType<ProducesResponseTypeAttribute>().Any(filter => filter.StatusCode == statusCode))
        {
            return;
        }

        action.Filters.Add(new ProducesResponseTypeAttribute(typeof(ApiResponse<object>), statusCode));
    }
}
