using Microsoft.EntityFrameworkCore;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
using PMWDS.Persistence.Context;
using TaskStatus = PMWDS.Domain.Enums.TaskStatus;

namespace PMWDS.Persistence.Migrations.Seeders;

internal static class UsersSeeder
{
    internal static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var departments = await context.Departments.ToListAsync(ct);
        var roles = await context.Roles.ToDictionaryAsync(r => r.Name, ct);
        var specs = BuildUserSpecs(departments);
        var imagePaths = await SeedProfileImagesAsync(ct);

        foreach (var spec in specs)
        {
            var user = await context.Users
                .Include(u => u.Roles)
                .FirstOrDefaultAsync(u => u.Email == spec.Email || u.EmployeeCode == spec.EmployeeCode, ct);

            if (user == null)
            {
                user = ApplicationUser.Create(spec.Email, spec.FirstName, spec.LastName, spec.EmployeeCode, spec.JobTitle, spec.DepartmentId);
                user.SetCreatedBy(SeedConstants.SeedUser);
                user.SetPassword(PasswordHelper.HashPassword(user, SeedConstants.DefaultPassword));
                user.UpdateAvailability(spec.Availability, spec.AvailabilityPercent);
                user.UpdateAIScores(spec.Performance, spec.Workload, spec.Burnout);
                await context.Users.AddAsync(user, ct);
            }
            else
            {
                user.UpdateProfile(spec.FirstName, spec.LastName, user.PhoneNumber, spec.JobTitle, user.ProfilePictureUrl);
                user.UpdateAvailability(spec.Availability, spec.AvailabilityPercent);
                user.UpdateAIScores(spec.Performance, spec.Workload, spec.Burnout);

                if (spec.Role.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
                {
                    user.ClearPrimaryDepartment();
                    user.ClearOrganization();
                    var assignments = await context.UserDepartments
                        .Where(assignment => assignment.UserId == user.Id)
                        .ToListAsync(ct);
                    if (assignments.Count > 0)
                        context.UserDepartments.RemoveRange(assignments);
                }
            }

            var profilePicUrl = imagePaths.TryGetValue(spec.EmployeeCode, out var path)
                ? path
                : $"https://api.dicebear.com/9.x/initials/svg?seed={user.EmployeeCode}";

            user.UpdateProfile(user.FirstName, user.LastName, user.PhoneNumber, user.JobTitle, profilePicUrl);

            if (roles.TryGetValue(spec.Role, out var role) && user.Roles.All(r => r.Id != role.Id))
                user.Roles.Add(role);
        }

        await context.SaveChangesAsync(ct);
        await SeedUserDepartmentsAsync(context, ct);
    }

    private static async Task SeedUserDepartmentsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var users = await context.Users.ToListAsync(ct);
        foreach (var user in users.Where(u => u.DepartmentId.HasValue))
        {
            var exists = await context.UserDepartments.AnyAsync(d => d.UserId == user.Id && d.DepartmentId == user.DepartmentId!.Value, ct);
            if (exists)
                continue;

            var assignment = UserDepartment.Create(user.Id, user.DepartmentId!.Value, isPrimary: true);
            assignment.SetCreatedBy(SeedConstants.SeedUser);
            await context.UserDepartments.AddAsync(assignment, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task<Dictionary<string, string>> SeedProfileImagesAsync(CancellationToken ct)
    {
        var result = new Dictionary<string, string>();
        var seedImagesDir = Path.Combine(AppContext.BaseDirectory, "SeedData", "Images");
        if (!Directory.Exists(seedImagesDir))
            return result;

        var storageBase = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Data"));
        Directory.CreateDirectory(storageBase);

        var extensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        var files = Directory.GetFiles(seedImagesDir)
            .Where(f => extensions.Contains(Path.GetExtension(f).ToLowerInvariant()));

        foreach (var file in files)
        {
            var employeeCode = Path.GetFileNameWithoutExtension(file).ToUpperInvariant();
            var ext = Path.GetExtension(file);
            var folderName = employeeCode[..Math.Min(4, employeeCode.Length)];
            var destFolder = Path.Combine(storageBase, folderName);
            Directory.CreateDirectory(destFolder);
            var destFile = Path.Combine(destFolder, $"{employeeCode.ToLowerInvariant()}{ext}");

            if (!File.Exists(destFile))
                File.Copy(file, destFile, overwrite: false);

            result[employeeCode] = $"/files/pmwds-files/{folderName}/{employeeCode.ToLowerInvariant()}{ext}";
        }

        return result;
    }

    private static SeedConstants.UserSpec[] BuildUserSpecs(List<Department> departments)
    {
        Guid Dept(string code) => departments.FirstOrDefault(d => d.Code == code)?.Id ?? departments.First().Id;
        return new[]
        {
            new SeedConstants.UserSpec("admin@pmwds.com", "Aarav", "Sharma", "ADMIN001", "SuperAdmin", "SuperAdmin", null, AvailabilityStatus.Available, 100, 92, 26, 0.08),
            new SeedConstants.UserSpec("director@pmwds.com", "Priya", "Menon", "DIR001", "Director", "Director", Dept("PMO"), AvailabilityStatus.PartiallyBusy, 72, 86, 58, 0.24),
            new SeedConstants.UserSpec("manager@pmwds.com", "Dev", "Kapoor", "PM001", "ProjectManager", "ProjectManager", Dept("PMO"), AvailabilityStatus.PartiallyBusy, 72, 86, 58, 0.24),
            new SeedConstants.UserSpec("head@pmwds.com", "Rohan", "Iyer", "DH001", "DepartmentHead", "DepartmentHead", Dept("ENG"), AvailabilityStatus.Busy, 64, 84, 66, 0.31),
            new SeedConstants.UserSpec("member@pmwds.com", "Karan", "Verma", "TM001", "TeamMember", "TeamMember", Dept("ENG"), AvailabilityStatus.Available, 88, 73, 38, 0.12),
            new SeedConstants.UserSpec("viewer@pmwds.com", "Meera", "Nair", "VW001", "Viewer", "Viewer", Dept("BSTR"), AvailabilityStatus.Available, 100, 60, 18, 0.05),
            new SeedConstants.UserSpec("ananya.patel@pmwds.com", "Ananya", "Patel", "ENG101", "Senior Engineer", "TeamMember", Dept("ENG"), AvailabilityStatus.PartiallyBusy, 70, 88, 61, 0.25),
            new SeedConstants.UserSpec("vikram.singh@northwind-labs.example", "Vikram", "Singh", "NDL201", "Director", "Director", Dept("OPS"), AvailabilityStatus.Available, 84, 79, 44, 0.16),
            new SeedConstants.UserSpec("sneha.kulkarni@contoso-transform.example", "Sneha", "Kulkarni", "CTO301", "Strategy Analyst", "TeamMember", Dept("BSTR"), AvailabilityStatus.Available, 92, 76, 35, 0.11)
        };
    }
}
