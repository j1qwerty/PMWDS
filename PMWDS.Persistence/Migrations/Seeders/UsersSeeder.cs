using Microsoft.EntityFrameworkCore;
using PMWDS.Application.Security;
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
        var roles = await context.Roles.ToDictionaryAsync(r => r.Key, ct);
        var org = await context.Organizations.FirstOrDefaultAsync(ct);
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
                if (org != null && spec.Role != RoleKeys.SuperAdmin)
                    user.AssignToOrganization(org.Id);
                await context.Users.AddAsync(user, ct);
            }
            else
            {
                user.UpdateProfile(spec.FirstName, spec.LastName, user.PhoneNumber, spec.JobTitle, user.ProfilePictureUrl);
                user.UpdateAvailability(spec.Availability, spec.AvailabilityPercent);
                user.UpdateAIScores(spec.Performance, spec.Workload, spec.Burnout);

                if (spec.Role == RoleKeys.SuperAdmin)
                {
                    user.ClearPrimaryDepartment();
                    user.ClearOrganization();
                    var assignments = await context.UserDepartments
                        .Where(assignment => assignment.UserId == user.Id)
                        .ToListAsync(ct);
                    if (assignments.Count > 0)
                        context.UserDepartments.RemoveRange(assignments);
                }
                else
                {
                    if (spec.DepartmentId.HasValue)
                        user.AssignToDepartment(spec.DepartmentId.Value);
                    if (org != null && user.OrganizationId == null)
                        user.AssignToOrganization(org.Id);
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
            // Existing users - reassigned to government departments
            new SeedConstants.UserSpec("admin@org1.com", "Aarav", "Sharma", "ADMIN001", "SuperAdmin", RoleKeys.SuperAdmin, null, AvailabilityStatus.Available, 100, 92, 26, 0.08),
            new SeedConstants.UserSpec("director@org1.com", "Priya", "Menon", "DIR001", "Director", RoleKeys.Director, Dept("PWD"), AvailabilityStatus.PartiallyBusy, 72, 86, 58, 0.24),
            new SeedConstants.UserSpec("manager@org1.com", "Dev", "Kapoor", "PM001", "ProjectManager", RoleKeys.ProjectManager, Dept("PWD"), AvailabilityStatus.PartiallyBusy, 72, 86, 58, 0.24),
            new SeedConstants.UserSpec("head.eng@org1.com", "Rohan", "Iyer", "DH001", "Engineering Head", RoleKeys.DepartmentHead, Dept("PWDC"), AvailabilityStatus.Busy, 64, 84, 66, 0.31),
            new SeedConstants.UserSpec("head.pmo@org1.com", "Sita", "Rao", "DH002", "PMO Head", RoleKeys.DepartmentHead, Dept("PWD"), AvailabilityStatus.PartiallyBusy, 70, 88, 54, 0.20),
            new SeedConstants.UserSpec("head.ops@org1.com", "Vikram", "Singh", "DH003", "Operations Head", RoleKeys.DepartmentHead, Dept("PROC"), AvailabilityStatus.Available, 84, 79, 44, 0.16),
            new SeedConstants.UserSpec("head.bstr@org1.com", "Meera", "Nair", "DH004", "Strategy Head", RoleKeys.DepartmentHead, Dept("REV"), AvailabilityStatus.Available, 100, 76, 35, 0.11),
            new SeedConstants.UserSpec("head.csv@org1.com", "Karan", "Verma", "DH005", "Client Services Head", RoleKeys.DepartmentHead, Dept("QA"), AvailabilityStatus.Available, 88, 73, 38, 0.12),
            new SeedConstants.UserSpec("member@org1.com", "Ananya", "Patel", "TM001", "TeamMember", RoleKeys.TeamMember, Dept("PWDC"), AvailabilityStatus.PartiallyBusy, 70, 88, 61, 0.25),
            new SeedConstants.UserSpec("viewer@org1.com", "Sneha", "Kulkarni", "VW001", "Viewer", RoleKeys.Viewer, Dept("PWD"), AvailabilityStatus.Available, 92, 60, 18, 0.05),

            // New government users - one per department
            new SeedConstants.UserSpec("rajesh.verma@pwd.up.gov.in", "Rajesh", "Verma", "CE001", "Chief Engineer", RoleKeys.ProjectManager, Dept("PWD"), AvailabilityStatus.Busy, 60, 90, 70, 0.30),
            new SeedConstants.UserSpec("sunil.yadav@up.gov.in", "Sunil", "Yadav", "REV001", "Tehsildar", RoleKeys.DepartmentHead, Dept("REV"), AvailabilityStatus.Available, 85, 75, 40, 0.15),
            new SeedConstants.UserSpec("vikas.gupta@up.gov.in", "Vikas", "Gupta", "APC001", "Senior Architect", RoleKeys.TeamMember, Dept("APC"), AvailabilityStatus.PartiallyBusy, 70, 82, 50, 0.20),
            new SeedConstants.UserSpec("amit.saxena@up.gov.in", "Amit", "Saxena", "TCP001", "Town Planner", RoleKeys.TeamMember, Dept("TCP"), AvailabilityStatus.Available, 90, 78, 35, 0.12),
            new SeedConstants.UserSpec("manoj.tiwari@up.gov.in", "Manoj", "Tiwari", "PROC001", "Procurement Officer", RoleKeys.TeamMember, Dept("PROC"), AvailabilityStatus.PartiallyBusy, 75, 80, 55, 0.22),
            new SeedConstants.UserSpec("dinesh.kumar@pwd.up.gov.in", "Dinesh", "Kumar", "PWDC001", "Executive Engineer", RoleKeys.TeamMember, Dept("PWDC"), AvailabilityStatus.Busy, 65, 85, 65, 0.28),
            new SeedConstants.UserSpec("pradeep.mishra@up.gov.in", "Pradeep", "Mishra", "JAL001", "Jal Nigam Engineer", RoleKeys.TeamMember, Dept("JAL"), AvailabilityStatus.PartiallyBusy, 70, 80, 48, 0.18),
            new SeedConstants.UserSpec("suresh.pandey@up.gov.in", "Suresh", "Pandey", "ELEC001", "Electrical Engineer", RoleKeys.TeamMember, Dept("ELEC"), AvailabilityStatus.Available, 88, 76, 42, 0.16),
            new SeedConstants.UserSpec("ramesh.yadav@up.gov.in", "Ramesh", "Yadav", "SEW001", "Sewerage Engineer", RoleKeys.TeamMember, Dept("SEW"), AvailabilityStatus.PartiallyBusy, 72, 78, 46, 0.19),
            new SeedConstants.UserSpec("harish.sharma@up.gov.in", "Harish", "Sharma", "HORT001", "Horticulture Officer", RoleKeys.TeamMember, Dept("HORT"), AvailabilityStatus.Available, 92, 72, 30, 0.10),
            new SeedConstants.UserSpec("alok.singh@pwd.up.gov.in", "Alok", "Singh", "QA001", "Quality Engineer", RoleKeys.TeamMember, Dept("QA"), AvailabilityStatus.Available, 85, 82, 38, 0.14),
        };
    }
}
