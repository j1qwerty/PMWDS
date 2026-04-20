using Microsoft.EntityFrameworkCore;
using PMWDS.Application.Interfaces.Repositories;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;
namespace PMWDS.Persistence.Repositories;

public class UserRepository
 : BaseRepository<ApplicationUser>, IUserRepository
{
    public UserRepository(ApplicationDbContext ctx)
    : base(ctx) { }
    public async Task<ApplicationUser?> GetByEmailAsync(
    string email, CancellationToken ct = default)
    => await _dbSet.FirstOrDefaultAsync(
    u => u.Email == email.ToLower(), ct);
    public async Task<IEnumerable<ApplicationUser>>
    GetByDepartmentAsync(
    Guid departmentId,
    CancellationToken ct = default)
    => await _dbSet
    .Where(u => u.DepartmentId == departmentId
    && u.IsActive)
    .Include(u => u.Skills)
    .ThenInclude(s => s.Skill)
    .ToListAsync(ct);
    public async Task<IEnumerable<ApplicationUser>>
    GetAvailableUsersAsync(
    CancellationToken ct = default)
    => await _dbSet
    .Where(u => u.IsActive
    && u.AvailabilityStatus ==
    Domain.Enums.AvailabilityStatus.Available)
    .Include(u => u.Skills)
    .ToListAsync(ct);
    public async Task<IEnumerable<ApplicationUser>>
    GetUsersBySkillAsync(
    Guid skillId, int minProficiency = 1,
    CancellationToken ct = default)
    => await _dbSet
    .Where(u => u.IsActive
    && u.Skills.Any(s =>
    s.SkillId == skillId
    && s.ProficiencyLevel >= minProficiency))
    .Include(u => u.Skills)
    .ToListAsync(ct);
    public async Task<IEnumerable<ApplicationUser>>
    GetUsersByRoleAsync(
    string roleName,
    CancellationToken ct = default)
    {
        return roleName switch
        {
            "SuperAdmin" => await _dbSet
                .Where(u => u.Email == "admin@pmwds.com" || u.JobTitle == "SuperAdmin")
                .ToListAsync(ct),
            "ProjectManager" => await _dbSet
                .Where(u => _context.Projects.Any(p => p.ProjectManagerId == u.Id.ToString()))
                .ToListAsync(ct),
            "DepartmentHead" => await _dbSet
                .Where(u => _context.Departments.Any(d => d.DepartmentHeadUserId == u.Id.ToString()))
                .ToListAsync(ct),
            "TeamLead" => await _dbSet
                .Where(u => u.JobTitle.Contains("Lead"))
                .ToListAsync(ct),
            "TeamMember" => await _dbSet
                .Where(u => u.IsActive)
                .ToListAsync(ct),
            _ => Enumerable.Empty<ApplicationUser>()
        };
    }
    public async Task<double> GetUserWorkloadScoreAsync(
    string userId,
    CancellationToken ct = default)
    {
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return 0;
        }

        var user = await _dbSet
        .FirstOrDefaultAsync(u => u.Id == parsedUserId, ct);
        return user?.AIWorkloadScore ?? 0;
    }
}
