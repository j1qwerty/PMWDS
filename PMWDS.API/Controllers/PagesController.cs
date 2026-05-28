using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Common;
using PMWDS.Application.DTOs.Notifications;
using PMWDS.Application.DTOs.Pages;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.DTOs.Users;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Application.Security;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;
using System.Text.Json;

namespace PMWDS.API.Controllers;

[Authorize(Policy = "Authenticated")]
public class PagesController : BaseApiController
{
    private readonly ApplicationDbContext _db;
    private readonly RoleScopeService _scope;
    private readonly ICurrentUserService _currentUser;

    public PagesController(
        ApplicationDbContext db,
        RoleScopeService scope,
        ICurrentUserService currentUser)
    {
        _db = db;
        _scope = scope;
        _currentUser = currentUser;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagesDataResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get([FromQuery] int page = 1, [FromQuery] int? pageSize = null, CancellationToken ct = default)
    {
        if (!Guid.TryParse(_currentUser.UserId, out var currentUserId))
        {
            return Unauthorized(new { message = "Authenticated user id is missing." });
        }

        var currentUser = await LoadCurrentUserAsync(currentUserId, ct);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "Authenticated user was not found." });
        }

        var userPageSize = ResolveUserPageSize(currentUser, pageSize);
        var returnedPageSize = Math.Clamp(userPageSize * 2, 1, 500);
        var pagination = new PaginationQuery(page, returnedPageSize);

        var organizationsQuery = await _scope.ScopeOrganizationsAsync(
            _db.Organizations.AsNoTracking().OrderBy(o => o.Name),
            ct);
        var departmentsQuery = await _scope.ScopeDepartmentsAsync(
            _db.Departments.AsNoTracking().Include(d => d.Organization).OrderBy(d => d.Name),
            ct);
        var projectsQuery = await _scope.ScopeProjectsAsync(
            _db.Projects.AsNoTracking()
                .Include(p => p.Department)
                .Include(p => p.Tasks)
                .OrderBy(p => p.Name),
            ct);
        var usersQuery = await _scope.ScopeUsersAsync(
            _db.Users.AsNoTracking()
                .Include(u => u.Department)
                .Include(u => u.DepartmentAssignments).ThenInclude(d => d.Department).ThenInclude(d => d.Organization)
                .Include(u => u.Profile)
                .Include(u => u.Roles)
                .Include(u => u.Skills).ThenInclude(s => s.Skill)
                .OrderBy(u => u.FirstName).ThenBy(u => u.LastName),
            ct);

        var organizationIds = await _scope.GetOrganizationIdsAsync(ct);
        var projectIds = await projectsQuery.Select(p => p.Id).ToListAsync(ct);
        var scopedUserIds = await usersQuery.Select(u => u.Id).ToListAsync(ct);

        var organizations = await GetOrganizationsAsync(organizationsQuery, pagination, ct);
        var departments = await ToPageAsync(
            departmentsQuery,
            pagination,
            d => new PageDepartmentDto(
                d.Id,
                d.Name,
                d.Code,
                d.Description,
                d.OrganizationId,
                d.Organization?.Name,
                d.DepartmentHeadUserId,
                d.MaxCapacity),
            ct);
        var projects = await GetProjectsAsync(projectsQuery, pagination, ct);
        var milestones = await ToPageAsync(
            _db.Milestones.AsNoTracking()
                .Include(m => m.Tasks)
                .Where(m => projectIds.Contains(m.ProjectId))
                .OrderBy(m => m.DueDate).ThenBy(m => m.Order),
            pagination,
            MilestoneDto.FromEntity,
            ct);
        var tasks = await ToPageAsync(
            BuildTaskQuery(projectIds).Where(t => t.ParentTaskId == null).OrderBy(t => t.DueDate),
            pagination,
            TaskDto.FromEntity,
            ct);
        var subtasks = await ToPageAsync(
            BuildTaskQuery(projectIds).Where(t => t.ParentTaskId != null).OrderBy(t => t.DueDate),
            pagination,
            TaskDto.FromEntity,
            ct);
        var users = await ToPageAsync(
            usersQuery,
            pagination,
            u => UserDto.FromEntityWithSkills(u, u.Roles.Select(r => r.Name).ToList()),
            ct);

        var response = new PagesDataResponse(
            Page: pagination.NormalizedPage,
            UserPageSize: userPageSize,
            ReturnedPageSize: returnedPageSize,
            GeneratedAt: DateTime.UtcNow,
            CurrentUser: UserDto.FromEntityWithSkills(currentUser, currentUser.Roles.Select(r => r.Name).ToList()),
            Organizations: organizations,
            Departments: departments,
            Projects: projects,
            Milestones: milestones,
            Tasks: tasks,
            Subtasks: subtasks,
            Users: users,
            Roles: HasPermission(currentUser, PermissionCodes.RoleView)
                ? await GetRolesAsync(pagination, ct)
                : EmptyPage<PageRoleDto>(pagination),
            Permissions: HasPermission(currentUser, PermissionCodes.PermissionView)
                ? await GetPermissionsAsync(pagination, ct)
                : EmptyPage<PagePermissionDto>(pagination),
            Notifications: await GetNotificationsAsync(currentUserId, pagination, ct),
            NotificationTemplates: HasPermission(currentUser, PermissionCodes.NotificationTemplateManage)
                ? await GetNotificationTemplatesAsync(pagination, ct)
                : EmptyPage<PageNotificationTemplateDto>(pagination),
            AlertRules: HasPermission(currentUser, PermissionCodes.NotificationRuleManage)
                ? await GetAlertRulesAsync(pagination, ct)
                : EmptyPage<PageAlertRuleDto>(pagination),
            Skills: await GetSkillsAsync(organizationIds, pagination, ct),
            Reports: HasPermission(currentUser, PermissionCodes.ReportView)
                ? await GetReportsAsync(scopedUserIds, pagination, ct)
                : EmptyPage<PageReportDto>(pagination),
            Integrations: HasPermission(currentUser, PermissionCodes.IntegrationView)
                ? await GetIntegrationsAsync(pagination, ct)
                : EmptyPage<PageIntegrationDto>(pagination),
            KnowledgeArticles: HasPermission(currentUser, PermissionCodes.KnowledgeView)
                ? await GetKnowledgeArticlesAsync(projectIds, pagination, ct)
                : EmptyPage<PageKnowledgeArticleDto>(pagination),
            LessonsLearned: HasPermission(currentUser, PermissionCodes.KnowledgeView)
                ? await GetLessonsLearnedAsync(projectIds, pagination, ct)
                : EmptyPage<PageLessonLearnedDto>(pagination),
            ActivityLogs: HasPermission(currentUser, PermissionCodes.ActivityLogView)
                ? await GetActivityLogsAsync(scopedUserIds, pagination, ct)
                : EmptyPage<PageActivityLogDto>(pagination));

        return Ok(response);
    }

    private Task<ApplicationUser?> LoadCurrentUserAsync(Guid currentUserId, CancellationToken ct)
        => _db.Users
            .Include(u => u.Department)
            .Include(u => u.DepartmentAssignments).ThenInclude(d => d.Department).ThenInclude(d => d.Organization)
            .Include(u => u.Profile)
            .Include(u => u.Roles).ThenInclude(r => r.Permissions)
            .Include(u => u.Skills).ThenInclude(s => s.Skill)
            .FirstOrDefaultAsync(u => u.Id == currentUserId, ct);

    private IQueryable<ProjectTask> BuildTaskQuery(IReadOnlyCollection<Guid> projectIds)
        => _db.Tasks.AsNoTracking()
            .Include(t => t.Project)
            .Include(t => t.Milestone)
            .Include(t => t.Assignments).ThenInclude(a => a.User)
            .Include(t => t.SubTasks)
            .Where(t => projectIds.Contains(t.ProjectId));

    private async Task<PaginatedResponse<PageOrganizationDto>> GetOrganizationsAsync(
        IQueryable<Organization> query,
        PaginationQuery pagination,
        CancellationToken ct)
    {
        var total = await query.CountAsync(ct);
        var organizations = await query.Skip(pagination.Skip).Take(pagination.NormalizedPageSize).ToListAsync(ct);
        var ids = organizations.Select(o => o.Id).ToList();
        var departmentCounts = await _db.Departments.AsNoTracking()
            .Where(d => d.OrganizationId.HasValue && ids.Contains(d.OrganizationId.Value))
            .GroupBy(d => d.OrganizationId!.Value)
            .Select(g => new { OrganizationId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.OrganizationId, g => g.Count, ct);

        var items = organizations
            .Select(o => new PageOrganizationDto(
                o.Id,
                o.Name,
                o.TaxId,
                o.ContactEmail,
                o.ContactPhone,
                departmentCounts.GetValueOrDefault(o.Id)))
            .ToList();

        return PaginatedResponse<PageOrganizationDto>.Create(items, pagination, total);
    }

    private async Task<PaginatedResponse<ProjectDto>> GetProjectsAsync(
        IQueryable<Project> query,
        PaginationQuery pagination,
        CancellationToken ct)
    {
        var total = await query.CountAsync(ct);
        var projects = await query.Skip(pagination.Skip).Take(pagination.NormalizedPageSize).ToListAsync(ct);
        var managerIds = projects
            .Select(p => p.ProjectManagerId)
            .Where(id => Guid.TryParse(id, out _))
            .Select(Guid.Parse)
            .Distinct()
            .ToList();
        var managerNames = await _db.Users.AsNoTracking()
            .Where(u => managerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id.ToString(), u => u.FullName, ct);
        var items = projects
            .Select(p => ProjectDto.FromEntity(p, managerNames.GetValueOrDefault(p.ProjectManagerId)))
            .ToList();

        return PaginatedResponse<ProjectDto>.Create(items, pagination, total);
    }

    private Task<PaginatedResponse<PageRoleDto>> GetRolesAsync(PaginationQuery pagination, CancellationToken ct)
        => ToPageAsync(
            _db.Roles.AsNoTracking().Include(r => r.Permissions).OrderBy(r => r.PermissionLevel).ThenBy(r => r.Name),
            pagination,
            r => new PageRoleDto(
                r.Id,
                r.Name,
                r.Description,
                r.PermissionLevel,
                r.PaginationPageSize,
                r.Permissions.Select(p => p.Code).OrderBy(code => code).ToList()),
            ct);

    private Task<PaginatedResponse<PagePermissionDto>> GetPermissionsAsync(PaginationQuery pagination, CancellationToken ct)
        => ToPageAsync(
            _db.Permissions.AsNoTracking().OrderBy(p => p.Module).ThenBy(p => p.Code),
            pagination,
            p => new PagePermissionDto(p.Id, p.Code, p.Name, p.Description, p.Module, p.IsGlobal),
            ct);

    private Task<PaginatedResponse<NotificationDto>> GetNotificationsAsync(
        Guid currentUserId,
        PaginationQuery pagination,
        CancellationToken ct)
        => ToPageAsync(
            _db.Notifications.AsNoTracking()
                .Where(n => n.UserId == currentUserId.ToString())
                .OrderByDescending(n => n.CreatedDate),
            pagination,
            n => new NotificationDto(
                n.Id,
                n.Title,
                n.Message,
                n.Type.ToString(),
                n.Priority.ToString(),
                n.IsRead,
                n.CreatedDate,
                n.ReadDate,
                n.ActionUrl),
            ct);

    private Task<PaginatedResponse<PageNotificationTemplateDto>> GetNotificationTemplatesAsync(PaginationQuery pagination, CancellationToken ct)
        => ToPageAsync(
            _db.NotificationTemplates.AsNoTracking().OrderBy(t => t.TemplateType),
            pagination,
            t => new PageNotificationTemplateDto(
                t.Id,
                t.TemplateType,
                t.SubjectTemplate,
                t.BodyTemplate,
                DeserializeStringList(t.VariablesJson),
                DeserializeStringList(t.SupportedChannelsJson)),
            ct);

    private Task<PaginatedResponse<PageAlertRuleDto>> GetAlertRulesAsync(PaginationQuery pagination, CancellationToken ct)
        => ToPageAsync(
            _db.AlertRules.AsNoTracking().OrderBy(r => r.Name),
            pagination,
            r => new PageAlertRuleDto(
                r.Id,
                r.Name,
                r.ConditionType,
                r.ConditionExpression,
                r.ActionType,
                r.ActionParametersJson,
                r.IsEnabled,
                r.LastTriggered),
            ct);

    private Task<PaginatedResponse<PageSkillDto>> GetSkillsAsync(
        IReadOnlyCollection<Guid> organizationIds,
        PaginationQuery pagination,
        CancellationToken ct)
        => ToPageAsync(
            _db.Skills.AsNoTracking()
                .Include(s => s.Organization)
                .Where(s => _scope.IsSuperAdmin || !s.OrganizationId.HasValue || organizationIds.Contains(s.OrganizationId.Value))
                .OrderBy(s => s.Category).ThenBy(s => s.Name),
            pagination,
            s => new PageSkillDto(s.Id, s.Name, s.Category, s.Description, s.OrganizationId, s.Organization?.Name),
            ct);

    private Task<PaginatedResponse<PageReportDto>> GetReportsAsync(
        IReadOnlyCollection<Guid> scopedUserIds,
        PaginationQuery pagination,
        CancellationToken ct)
        => ToPageAsync(
            _db.Reports.AsNoTracking()
                .Where(r => _scope.IsSuperAdmin || scopedUserIds.Contains(r.GeneratedByUserId))
                .OrderByDescending(r => r.GeneratedDate),
            pagination,
            r => new PageReportDto(
                r.Id,
                r.Name,
                r.ReportType,
                r.ParametersJson,
                r.GeneratedDate,
                r.Format,
                r.GeneratedByUserId,
                r.Data.Length),
            ct);

    private Task<PaginatedResponse<PageIntegrationDto>> GetIntegrationsAsync(PaginationQuery pagination, CancellationToken ct)
        => ToPageAsync(
            _db.Integrations.AsNoTracking().OrderBy(i => i.Name),
            pagination,
            i => new PageIntegrationDto(
                i.Id,
                i.IntegrationType,
                i.Name,
                i.ConfigurationJson,
                i.IsActive,
                i.LastSync,
                i.Status),
            ct);

    private async Task<PaginatedResponse<PageKnowledgeArticleDto>> GetKnowledgeArticlesAsync(
        IReadOnlyCollection<Guid> projectIds,
        PaginationQuery pagination,
        CancellationToken ct)
    {
        var query = _db.KnowledgeArticles.AsNoTracking()
            .Where(a => !a.ProjectId.HasValue || projectIds.Contains(a.ProjectId.Value))
            .OrderByDescending(a => a.LastUpdated);
        var total = await query.CountAsync(ct);
        var articles = await query.Skip(pagination.Skip).Take(pagination.NormalizedPageSize).ToListAsync(ct);
        var names = await GetProjectNamesAsync(articles.Where(a => a.ProjectId.HasValue).Select(a => a.ProjectId!.Value), ct);
        var items = articles.Select(a => new PageKnowledgeArticleDto(
            a.Id,
            a.ProjectId,
            a.ProjectId.HasValue ? names.GetValueOrDefault(a.ProjectId.Value) : null,
            a.Title,
            a.Category,
            DeserializeStringList(a.TagsJson),
            a.AuthorId,
            a.CreatedDate,
            a.LastUpdated,
            a.ViewCount,
            a.RelevanceScore)).ToList();

        return PaginatedResponse<PageKnowledgeArticleDto>.Create(items, pagination, total);
    }

    private async Task<PaginatedResponse<PageLessonLearnedDto>> GetLessonsLearnedAsync(
        IReadOnlyCollection<Guid> projectIds,
        PaginationQuery pagination,
        CancellationToken ct)
    {
        var query = _db.LessonsLearned.AsNoTracking()
            .Where(l => projectIds.Contains(l.ProjectId))
            .OrderByDescending(l => l.RecordedDate);
        var total = await query.CountAsync(ct);
        var lessons = await query.Skip(pagination.Skip).Take(pagination.NormalizedPageSize).ToListAsync(ct);
        var names = await GetProjectNamesAsync(lessons.Select(l => l.ProjectId), ct);
        var items = lessons.Select(l => new PageLessonLearnedDto(
            l.Id,
            l.ProjectId,
            names.GetValueOrDefault(l.ProjectId),
            l.Title,
            l.Category,
            l.Impact,
            DeserializeStringList(l.KeywordsJson),
            l.RecordedDate)).ToList();

        return PaginatedResponse<PageLessonLearnedDto>.Create(items, pagination, total);
    }

    private async Task<PaginatedResponse<PageActivityLogDto>> GetActivityLogsAsync(
        IReadOnlyCollection<Guid> scopedUserIds,
        PaginationQuery pagination,
        CancellationToken ct)
    {
        var query = _db.ActivityLogs.AsNoTracking()
            .Where(l => _scope.IsSuperAdmin || scopedUserIds.Contains(l.UserId))
            .OrderByDescending(l => l.Timestamp);
        var total = await query.CountAsync(ct);
        var logs = await query.Skip(pagination.Skip).Take(pagination.NormalizedPageSize).ToListAsync(ct);
        var userNames = await _db.Users.AsNoTracking()
            .Where(u => logs.Select(l => l.UserId).Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, ct);
        var projectNames = await GetProjectNamesAsync(logs.Where(l => l.ProjectId.HasValue).Select(l => l.ProjectId!.Value), ct);
        var items = logs.Select(l => new PageActivityLogDto(
            l.Id,
            l.UserId,
            userNames.GetValueOrDefault(l.UserId),
            l.ProjectId,
            l.ProjectId.HasValue ? projectNames.GetValueOrDefault(l.ProjectId.Value) : null,
            l.ActivityType,
            l.Description,
            l.Timestamp,
            DeserializeDictionary(l.MetadataJson))).ToList();

        return PaginatedResponse<PageActivityLogDto>.Create(items, pagination, total);
    }

    private async Task<Dictionary<Guid, string>> GetProjectNamesAsync(IEnumerable<Guid> projectIds, CancellationToken ct)
    {
        var ids = projectIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, string>();
        }

        return await _db.Projects.AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);
    }

    private static async Task<PaginatedResponse<TDto>> ToPageAsync<TEntity, TDto>(
        IQueryable<TEntity> query,
        PaginationQuery pagination,
        Func<TEntity, TDto> map,
        CancellationToken ct)
    {
        var total = await query.CountAsync(ct);
        var entities = await query.Skip(pagination.Skip).Take(pagination.NormalizedPageSize).ToListAsync(ct);
        return PaginatedResponse<TDto>.Create(entities.Select(map).ToList(), pagination, total);
    }

    private static PaginatedResponse<T> EmptyPage<T>(PaginationQuery pagination)
        => PaginatedResponse<T>.Create(Array.Empty<T>(), pagination, 0);

    private static int ResolveUserPageSize(ApplicationUser user, int? requestedPageSize)
    {
        if (requestedPageSize.HasValue)
        {
            return Math.Clamp(requestedPageSize.Value, 1, 500);
        }

        var rolePageSize = user.Roles
            .Select(r => r.PaginationPageSize)
            .Where(size => size > 0)
            .DefaultIfEmpty(10)
            .Max();

        return Math.Clamp(rolePageSize, 1, 500);
    }

    private static bool HasPermission(ApplicationUser user, string permissionCode)
        => user.Roles.Any(role =>
            role.Permissions.Any(permission => permission.Code.Equals(PermissionCodes.SystemAdmin, StringComparison.OrdinalIgnoreCase)) ||
            role.Permissions.Any(permission => permission.Code.Equals(permissionCode, StringComparison.OrdinalIgnoreCase)));

    private static List<string> DeserializeStringList(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch (JsonException)
        {
            return new List<string>();
        }
    }

    private static Dictionary<string, object> DeserializeDictionary(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new Dictionary<string, object>();
        }
        catch (JsonException)
        {
            return new Dictionary<string, object>();
        }
    }
}
