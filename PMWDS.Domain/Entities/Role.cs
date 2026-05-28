using PMWDS.Domain.Common;

namespace PMWDS.Domain.Entities;

public class Role : AuditableEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public int PermissionLevel { get; private set; }
    public int PaginationPageSize { get; private set; } = 10;
    public ICollection<Permission> Permissions { get; private set; } = new List<Permission>();
    public ICollection<ApplicationUser> Users { get; private set; } = new List<ApplicationUser>();

    protected Role() { }

    public static Role Create(string name, string description, int permissionLevel)
    {
        return new Role
        {
            Name = name.Trim(),
            Description = description.Trim(),
            PermissionLevel = permissionLevel
        };
    }

    public void Update(string name, string description, int permissionLevel)
    {
        Name = name.Trim();
        Description = description.Trim();
        PermissionLevel = permissionLevel;
    }

    public void UpdatePaginationPageSize(int pageSize)
        => PaginationPageSize = Math.Clamp(pageSize, 1, 500);

    public void AddPermission(Permission permission)
    {
        if (Permissions.All(p => p.Id != permission.Id))
        {
            Permissions.Add(permission);
        }
    }

    public void RemovePermission(Guid permissionId)
    {
        var permission = Permissions.FirstOrDefault(p => p.Id == permissionId);
        if (permission != null)
        {
            Permissions.Remove(permission);
        }
    }

    public bool CheckPermission(string permissionCode)
        => Permissions.Any(p => p.Code.Equals(permissionCode, StringComparison.OrdinalIgnoreCase));

    public Role Clone()
    {
        var clone = Create($"{Name} Copy", Description, PermissionLevel);
        foreach (var permission in Permissions)
        {
            clone.AddPermission(permission);
        }

        return clone;
    }
}
