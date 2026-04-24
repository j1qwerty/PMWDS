using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Controllers;

public class RolesController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly ApplicationDbContext _context;

    public RolesController(IUnitOfWork uow, ApplicationDbContext context)
    {
        _uow = uow;
        _context = context;
    }

    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetRoles(CancellationToken ct)
    {
        var roles = await _context.Roles
            .Include(r => r.Permissions)
            .OrderBy(r => r.PermissionLevel)
            .ToListAsync(ct);

        return Ok(roles.Select(r => new RoleResponse(
            r.Id,
            r.Name,
            r.Description,
            r.PermissionLevel,
            r.Permissions.Select(MapPermission).ToList())));
    }

    [HttpGet("permissions")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetPermissions(CancellationToken ct)
        => Ok((await _context.Permissions.OrderBy(p => p.Module).ThenBy(p => p.Name).ToListAsync(ct)).Select(MapPermission));

    [HttpPost]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest req, CancellationToken ct)
    {
        if (await _context.Roles.AnyAsync(r => r.Name == req.Name, ct))
        {
            return Conflict(new { message = $"Role '{req.Name}' already exists." });
        }

        var role = Role.Create(req.Name, req.Description, req.PermissionLevel);
        role.SetCreatedBy("system");

        var permissions = await _context.Permissions
            .Where(p => req.PermissionIds.Contains(p.Id))
            .ToListAsync(ct);
        foreach (var permission in permissions)
        {
            role.AddPermission(permission);
        }

        await _uow.Roles.AddAsync(role, ct);
        await _uow.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetRoles), new { id = role.Id }, new RoleResponse(
            role.Id,
            role.Name,
            role.Description,
            role.PermissionLevel,
            permissions.Select(MapPermission).ToList()));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest req, CancellationToken ct)
    {
        var role = await _context.Roles
            .Include(r => r.Permissions)
            .FirstOrDefaultAsync(r => r.Id == id, ct);
        if (role == null)
        {
            return NotFound();
        }

        role.Update(req.Name, req.Description, req.PermissionLevel);

        var permissions = await _context.Permissions
            .Where(p => req.PermissionIds.Contains(p.Id))
            .ToListAsync(ct);

        role.Permissions.Clear();
        foreach (var permission in permissions)
        {
            role.AddPermission(permission);
        }

        await _uow.Roles.UpdateAsync(role, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(new RoleResponse(role.Id, role.Name, role.Description, role.PermissionLevel, permissions.Select(MapPermission).ToList()));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> DeleteRole(Guid id, CancellationToken ct)
    {
        await _uow.Roles.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("permissions")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> CreatePermission([FromBody] CreatePermissionRequest req, CancellationToken ct)
    {
        if (await _context.Permissions.AnyAsync(p => p.Code == req.Code.ToUpper(), ct))
        {
            return Conflict(new { message = $"Permission code '{req.Code}' already exists." });
        }

        var permission = Permission.Create(req.Code, req.Name, req.Description, req.Module, req.IsGlobal);
        permission.SetCreatedBy("system");
        await _uow.Permissions.AddAsync(permission, ct);
        await _uow.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetPermissions), new { id = permission.Id }, MapPermission(permission));
    }

    [HttpPut("permissions/{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> UpdatePermission(Guid id, [FromBody] UpdatePermissionRequest req, CancellationToken ct)
    {
        var permission = await _uow.Permissions.GetByIdAsync(id, ct);
        if (permission == null)
        {
            return NotFound();
        }

        permission.Update(req.Name, req.Description, req.Module, req.IsGlobal);
        await _uow.Permissions.UpdateAsync(permission, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(MapPermission(permission));
    }

    [HttpDelete("permissions/{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> DeletePermission(Guid id, CancellationToken ct)
    {
        await _uow.Permissions.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    private static PermissionResponse MapPermission(Permission permission)
        => new(permission.Id, permission.Code, permission.Name, permission.Description, permission.Module, permission.IsGlobal);
}

public record RoleResponse(
    Guid Id,
    string Name,
    string Description,
    int PermissionLevel,
    List<PermissionResponse> Permissions);

public record PermissionResponse(
    Guid Id,
    string Code,
    string Name,
    string Description,
    string Module,
    bool IsGlobal);

public record CreateRoleRequest(string Name, string Description, int PermissionLevel, List<Guid> PermissionIds);
public record UpdateRoleRequest(string Name, string Description, int PermissionLevel, List<Guid> PermissionIds);
public record CreatePermissionRequest(string Code, string Name, string Description, string Module, bool IsGlobal);
public record UpdatePermissionRequest(string Name, string Description, string Module, bool IsGlobal);
