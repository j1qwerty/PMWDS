using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.API.Services;

namespace PMWDS.API.Controllers;

public class SystemController : BaseApiController
{
    private readonly DatabaseConnectionStatus _databaseStatus;

    public SystemController(DatabaseConnectionStatus databaseStatus)
    {
        _databaseStatus = databaseStatus;
    }

    [HttpGet("database")]
    [Authorize(Policy = AuthorizationPolicies.SuperAdmin)]
    public IActionResult GetDatabaseStatus()
        => Ok(new
        {
            provider = _databaseStatus.ProviderName,
            providerKey = _databaseStatus.Provider.ToString(),
            connectionName = _databaseStatus.ConnectionName,
            dataSource = _databaseStatus.DisplayDataSource,
            isFallback = _databaseStatus.IsFallback,
            attempts = _databaseStatus.AttemptLog
        });
}
