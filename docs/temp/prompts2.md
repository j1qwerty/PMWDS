# config 
## flow
existing flow : organizations -> departments(multiple) -> projects (multiple) -> milestones ( multiple) -> tasks(multiple) -> sub tasks(multiple) 


### heirarchy 
organisation (superadmin only ) 


## roles and permissions
Authorization Policies are role based, NOT permission-based. The Permission entity is defined in domain but not used for authorization checks at the API layer. add all missing permissions and fix this issue
Authorization checks proper .
Permission Entity (Unused)
The Permission entity (PMWDS.Domain/Entities/Permission.cs) has:

Code (unique, e.g., "PROJECT_CREATE")
Module, Name, Description
IsGlobal
Many-to-many with Role
Roles are seeded with ~200 permissions via SeedData.cs, but the API never checks permissions. Only role string checks via [Authorize(Policy = "...")] are used.

### scopes
- seperate scope for create , edit , delete permission for all features
- for each crud operations and all other api use proeper restful responses and methods
- can manage permission for all features ( create edit delete sepatrate option)

## activity logs
- we are logging all activites but in get api for activity logs we send raw data with id and not the actual name or values (for example : 
```json
POST /api/v1/users/e335c727-009b-4e5f-8617-bf291fa23371/profile-picture
11:17 AM
5/22/2026
Created or submitted data at /api/v1/users/e335c727-009b-4e5f-8617-bf291fa23371/profile-picture.

Priya Menon
Priya Menon
View metadata
{
  "path": "/api/v1/users/e335c727-009b-4e5f-8617-bf291fa23371/profile-picture",
  "method": "POST",
  "statusCode": 200,
  "elapsedMs": 360
}
```
instead on server side fetch the appropriate values and also include them like name of user and name or organisaiton , name of department etc , create proper methods to help this)

### roles superadmin , direcotr, project manager, member 
- superadmin : crud all
- director ( organisation specific )

### issue fixes 
PMWDS.API/Services/RoleScopeService.cs — Central service for data-level scoping.
- N+1 queries: Each scope/can-access method hits the database independently (e.g., CanAccessProjectAsync queries project → then calls CanAccessOrganizationAsync which queries departments → then calls GetOrganizationIdsAsync which queries UserDepartments + Users)
- No caching: Organization/Department IDs re-queried on every request
- BL in API layer: Scoping logic lives in API services (RoleScopeService), not in Application/Domain layer — breaks Clean Architecture
- No tenant context: No TenantId or OrganizationId filter baked into the DbContext automatically
- Some controllers bypass scoping (e.g., OrganizationsController.GetAll() does manual LINQ filtering instead of using ScopeOrganizationsAsync)

Auth Flow
POST /api/v1/auth/login → validates credentials
JWT token generated with claims: NameIdentifier, Email, Name, DepartmentId, Roles
AuthController.cs:224-252 — GenerateToken() creates JWT with roles as ClaimTypes.Role
Program.cs:88-95 — AddAuthorization() maps policies to required roles
Controllers use [Authorize(Policy = "PolicyName")] for access control
RoleScopeService checks access at organization/department level for data scoping
Issues with Current Authorization
Hardcoded policy names — "Authenticated", "Manager", "Director", "SuperAdmin", "TaskEditor" are not constant-driven
Permission entity exists but is never used in authorization pipeline — no permission-based checks
[Authorize(Roles = "...")] used in some controllers alongside policies — inconsistent (e.g., NotificationsController.cs:141 uses [Authorize(Roles = "SuperAdmin,Director,DepartmentHead")] directly)
No centralized claim/permission check — each controller repeats scoping logic
Role fallback via JobTitle string matching is fragile and non-deterministic

Inline Controller DTOs
Many controllers define DTOs as record types at the bottom of the controller file (mixed concerns):

OrganizationsController.cs:179-193 — OrganizationResponse, OrganizationDirectorResponse, OrganizationDepartmentResponse, UpsertOrganizationRequest
DepartmentsController.cs:250-276 — DepartmentDto, CreateDepartmentDto, UpdateDepartmentDto
MilestonesController.cs:144-158 — CreateMilestoneDto, UpdateMilestoneDto
TasksController.cs:744-747 — UpdateTaskStatusRequest, AssignTaskRequest, AddCommentRequest, StartTimerRequest
UsersController.cs:746-761 — UpdateAvailabilityRequest, AddUserSkillRequest, UpdateUserSkillRequest, AssignUserDepartmentsRequest
AuthController.cs:272-276 — LoginRequest, ChangePasswordRequest, SignupRequest, ForgotPasswordRequest, ResetPasswordRequest
RolesController.cs:157-175 — RoleResponse, PermissionResponse, CreateRoleRequest, UpdateRoleRequest, CreatePermissionRequest, UpdatePermissionRequest
NotificationsController.cs:272-309 — BroadcastNotificationRequest, NotificationTemplateResponse, UpsertNotificationTemplateRequest, AlertRuleResponse, UpsertAlertRuleRequest
ProfilesController.cs:83-99 — UserProfileResponse, UpsertProfileRequest
ActivityLogsController.cs:134-135 — ActivityLogResponse, CreateActivityLogRequest
Issues with DTOs
Mixed locations: DTOs are split between Application/DTOs/ and inline in controllers — no consistency
No validation attributes: No [Required], [StringLength], or FluentValidation rules on most DTOs (except AuthController inline checks)
Domain enum strings exposed: Status/Priority sent as .ToString() instead of consistent enums or integer IDs
Inline DTOs in controllers violate Single Responsibility — controller files contain response models
ProjectDto.FromEntity() does not resolve ProjectManagerName — always returns null (line 59)
TaskDto is overloaded — 40 fields including nested collections; no pagination support for comments/attachments

Password hashing uses SHA256(userId + password) — NOT bcrypt/Argon2 (vulnerable to rainbow tables)
Fallback passwords ("Pmwds@123", "Admin@12345!") are hardcoded in IsPasswordValid()

UnitOfWork
Interface: PMWDS.Application/Interfaces/Services/IUnitOfWork.cs Implementation: PMWDS.Persistence/Repositories/UnitOfWork.cs

Exposes 30+ typed repository properties (every entity has a repository), plus:

SaveChangesAsync() — delegates to DbContext
BeginTransactionAsync() / CommitTransactionAsync() / RollbackTransactionAsync()
Issues with Repositories
IRepository.FindAsync() returns IEnumerable (in-memory), not IQueryable — breaks query composition; all filtering happens client-side after loading all rows
Massive UnitOfWork with 30+ properties — violates Interface Segregation Principle
BaseRepository.UpdateAsync() sets EntityState.Modified on the entire entity — no change tracking, always updates all columns
No pagination support in base repository — GetAllAsync() loads everything into memory. Some controllers manually do .Skip().Take() in-memory after fetching all
UserRepository.IncludeIdentityGraph() eagerly loads Department + DepartmentAssignments + Department.Organization + Profile + Roles on EVERY query — even when not needed

Issues with CQRS
Inconsistent usage: Some operations go through CQRS handlers (projects/tasks), others manipulate entities directly in controllers (departments, milestones, users, organizations, roles, notifications)
Handlers duplicate scoping checks: Controllers check scoping before calling Mediator.Send(), but handlers do not re-verify (relying on controller layer)
No validation pipeline: FluentValidation is registered but not used for request validation
No transaction handling: Handlers use SaveChangesAsync directly without wrapping in transactions

Middleware & Cross-Cutting Concerns
ExceptionMiddleware
PMWDS.API/Middleware/ExceptionMiddleware.cs — Global exception handler mapping:

NotFoundException → 404
ValidationException → 400
UnauthorizedAccessException → 401
ConflictException → 409
All others → 500
RequestLoggingMiddleware
PMWDS.API/Middleware/RequestLoggingMiddleware.cs — Logs all requests + auto-creates ActivityLog for non-GET, successful requests.

SignalR Hubs
Hub	Route	Groups
NotificationHub	/hubs/notifications	User/department/role groups
DashboardHub	/hubs/dashboard	Department/project groups
11. Issues & Improvement Recommendations
🚨 Critical Security Issues
Issue	Location	Recommendation
SHA256 password hashing (no salt per standard, uses userId as salt)	AuthController.cs:254-255	Replace with BCrypt.Net or ASP.NET Core Identity PasswordHasher
Hardcoded fallback passwords	AuthController.cs:218-221	Remove fallbacks; require proper password setup
JWT secret could be weak	appsettings.json → Jwt:Secret	Enforce minimum 32-char secret; rotate periodically
No rate limiting on auth endpoints	AuthController	Add rate limiting (e.g., 5 login attempts/minute)
No email verification	AuthController.Signup()	Require email verification before allowing login
🔴 High Priority Issues
Issue	Location	Recommendation
IRepository.FindAsync returns IEnumerable (in-memory filtering)	BaseRepository.cs:24-27	Return IQueryable<T> for composability and SQL-level filtering
No pagination in base repository	BaseRepository.cs	Add PaginatedList<T> with skip/take + total count
Permissions model exists but unused	Role.cs, Permission.cs	Implement permission-based authorization, not just role-name checks
Cross-contamination of DTOs	Mixed across Application/DTOs/ and controller files	Move ALL DTOs to Application/DTOs/ — never inline in controllers
Inconsistent CQRS usage	Some operations via MediatR, some direct	Standardize: ALL write operations go through CQRS Commands
No request validation	FluentValidation registered but unused	Add FluentValidation validators for all DTOs + pipeline behavior
Massive UnitOfWork	IUnitOfWork.cs — 30+ properties	Split into domain-specific interfaces (IOrganizationUnitOfWork, IProjectUnitOfWork) or use DbContext directly
🟡 Medium Priority Issues
Issue	Location	Recommendation
Controllers mixed with DTOs	DTO records at bottom of controller files	Extract to Application/DTOs/ namespace
RoleScopeService in API layer (breaks Clean Architecture)	RoleScopeService.cs	Move scoping logic to Application layer as pipeline behaviors/mediator middleware
N+1 scope queries	RoleScopeService.cs — multiple DB calls per request	Cache organization/department IDs per request (use IMemoryCache scoped to HttpContext)
No global tenant filter	All scope methods manually filter	Use EF Core HasQueryFilter with ITenantService injected at DbContext level
Eager loading in UserRepository	UserRepository.cs:102-109 — always loads everything	Use split queries or projection (Select)
ProjectManagerName always null	ProjectDto.cs:59	Resolve from Users table
Domain events registered but never consumed	ProjectEvents.cs, TaskEvents.cs	Add INotificationHandler<T> implementations in Application layer
No soft-delete global filter for AuditLog	ApplicationDbContext.cs:61-69	Add to global query filter
RoleScopeService.ScopeUsersAsync() complex logic	RoleScopeService.cs:117-153	Simplify; extract DepartmentHead-specific logic into separate method
TasksController.CanWorkOnTaskAsync() duplicates scope logic	TasksController.cs:683-708	Move to RoleScopeService
IsUserInProjectOrganizationAsync() duplicated	ProjectsController.cs:299-322 and TasksController.cs:718-741	Extract to shared service
🟢 Low Priority / Nice-to-Have
Issue	Location	Recommendation
No API versioning	All routes are /api/v1/ hardcoded	Use Asp.Versioning.Mvc for proper versioning
No caching layer for reads	Projects/Users/Departments endpoints	Add [ResponseCache] or distributed cache with invalidation
No Swagger annotations	Controllers	Add [ProducesResponseType] attributes for API documentation
Error response format inconsistent	Some controllers return {message}, others {Message}	Standardize to camelCase JSON
No audit trail for read operations	AuditLog.cs only logs writes	Add read audit for sensitive data (optional)
ActivityLog.UserId is Guid, AuditLog.UserId is string	Inconsistency	Make consistent — use string for both
UserDto.LastLoginDate always null	UserDto.cs:59	Track last login in AuthController.Login()
No CancellationToken in some calls	Various places	Ensure all async calls pass ct
SignalR hubs have empty implementation	DashboardHub.cs, NotificationHub.cs	Add hub methods or remove if unused
Architecture Improvements
1. Permission-Based Authorization Pipeline
// Instead of role checks, implement:
[Authorize(Policy = "Permission")]
// With a PermissionAuthorizationHandler that checks:
// User.Roles.Permissions.Any(p => p.Code == "PROJECT_CREATE")
This would use the existing Permission entity that's already seeded with data.

2. Tenant/Organization Scoping via EF Core Interceptors
Create an ITenantService that provides the current user's organization IDs, and use EF Core SaveChangesInterceptor + QueryFilter to auto-scope:

builder.Entity<Project>().HasQueryFilter(p => 
    _tenant.OrganizationIds.Contains(p.Department.OrganizationId));
3. API Consolidation — Role-Wise Data API
New endpoint pattern: GET /api/v1/{scope}/dashboard

Where {scope} could be:

/api/v1/my/dashboard — returns all data for current user (their org → dept → projects → milestones → tasks)
/api/v1/organizations/{orgId}/dashboard — org-level dashboard with all nested entities
This would be a single optimized query that returns the full hierarchy in one response, avoiding N+1 API calls from the frontend.

4. Split UnitOfWork
public interface IProjectUnitOfWork : IDisposable
{
    IProjectRepository Projects { get; }
    IRepository<Milestone> Milestones { get; }
    IRepository<ProjectDocument> ProjectDocuments { get; }
}

public interface IUserUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IRepository<Role> Roles { get; }
    IRepository<UserProfile> UserProfiles { get; }
}
5. Add Pagination Support
public class PaginatedList<T>
{
    public List<T> Items { get; }
    public int Page { get; }
    public int PageSize { get; }
    public int TotalCount { get; }
    public int TotalPages { get; }
}
Update IRepository to include paginated queries.

6. Standardize Error Response
Create a consistent ApiResponse<T> wrapper:

public record ApiResponse<T>(T Data, string? Message = null, List<string>? Errors = null);
Summary of File Locations
Domain Layer
Component	Path
Base classes	PMWDS.Domain/Common/BaseEntity.cs, AuditableEntity.cs, ValueObject.cs, DomainEvent.cs
Entities	PMWDS.Domain/Entities/*.cs
Enums	PMWDS.Domain/Enums/ProjectEnums.cs, TaskEnums.cs, UserEnums.cs
Events	PMWDS.Domain/Events/ProjectEvents.cs, TaskEvents.cs
Application Layer
Component	Path
DTOs	PMWDS.Application/DTOs/Projects/, Tasks/, Users/, Notifications/
CQRS Commands	PMWDS.Application/Features/Projects/Commands/, Tasks/Commands/
CQRS Queries	PMWDS.Application/Features/Projects/Queries/, Users/Queries/, AI/Queries/
Repository Interfaces	PMWDS.Application/Interfaces/Repositories/IRepository.cs, IProjectRepository.cs, ITaskRepository.cs, IUserRepository.cs
Service Interfaces	PMWDS.Application/Interfaces/Services/IUnitOfWork.cs, ICurrentUserService.cs, INotificationService.cs, etc.
Persistence Layer
Component	Path
DbContext	PMWDS.Persistence/Context/ApplicationDbContext.cs
EF Configurations	PMWDS.Persistence/Configurations/
Migrations	PMWDS.Persistence/Migrations/
Repositories	PMWDS.Persistence/Repositories/BaseRepository.cs, ProjectRepository.cs, TaskRepository.cs, UserRepository.cs, UnitOfWork.cs
API Layer
Component	Path
Controllers	PMWDS.API/Controllers/AuthController.cs, OrganizationsController.cs, DepartmentsController.cs, ProjectsController.cs, MilestonesController.cs, TasksController.cs, UsersController.cs, RolesController.cs, NotificationsController.cs, ProfilesController.cs, ActivityLogsController.cs, BaseApiController.cs
Services	PMWDS.API/Services/RoleScopeService.cs, UserRoleResolver.cs, CurrentUserService.cs
Middleware	PMWDS.API/Middleware/ExceptionMiddleware.cs, RequestLoggingMiddleware.cs
Hubs	PMWDS.API/Hubs/NotificationHub.cs, DashboardHub.cs
Startup	PMWDS.API/Program.cs
Infrastructure Layer
Component	Path
Services	PMWDS.Infrastructure/Services/NotificationService.cs, AuditService.cs, EmailService.cs, AzureBlobStorageService.cs, LocalFileStorageService.cs, ReportService.cs, RedisCacheService.cs
Jobs	PMWDS.Infrastructure/Jobs/DeadlineCheckerJob.cs, EscalationCheckerJob.cs, AIModelTrainingJob.cs, ScheduledReportJob.cs
Settings	PMWDS.Infrastructure/Settings/AppSettings.cs (with nested settings)


# pagination
- all data results fetched paginated (by default 10 of each, )
- option to set paginatied value for each role (user can selelct out of 10, 20,30,50, 100 results per page or can set their own number )

# ui
- make neccessary changes for everything done above to reflect in ui also
- integrate everything in ui properly
- skip everything in client/src/old those are old ui components ignore them and do not touch

switch to branch pmwdsS then start this implementation and also update the ui to reflect these changes in ui react app in client folder,
make commit on each step or feature

# new goal - important
- new required flow (goal) : organizations -> projects (multiple) -> milestones ( multiple) -> tasks(multiple) -> sub tasks(multiple) and also organizatoin -> departments(multiple) and projects (multiple) -> assign deprtments to projects 

switch to branch pmwdsA then start this implementation and also update the ui to reflect these changes in ui react app in client folder,
make commit on each step or feature
- make neccessary changes for everything done above to reflect in ui also
- integrate everything in ui properly
- skip everything in client/src/old those are old ui components ignore them and do not touch


# prompts
## new goal from scratch
our app will have two versions of app living in two separate branches
the current version with this flow
- existing flow : organizations -> departments(multiple) -> projects (multiple) -> milestones ( multiple) -> tasks(multiple) -> sub tasks(multiple) 
living in current branch pmwdsS

### new version with different flow living in branch pmwdsA
 ### new goal - important
- new required flow (goal) : organizations -> projects (multiple) -> milestones ( multiple) -> tasks(multiple) -> sub tasks(multiple) and also organizatoin -> departments(multiple) and projects (multiple) -> assign deprtments to projects 
while keeping or updating the existings api to support this new flow.
NOTE - switch to new branch pmwdsA then start this implementation.
make sure both versions work in this new structure depending on what the ui passes ( simple solution would be to make sure that multiple departments can be assigned to any project, as if we provide single department then it follows old structure and if we provide multiple departments it follows new structure)
- update other controllers also such that when we have list of departments assigned to any project then details related to all departments are passed through other api which need this updated 
NOTE - api updates only related to Auth, Users, Profiles, Roles/Permissions, Organizations, Departments, Projects, Milestones, Tasks (with subtasks), Notifications, Activity Logs 


react app is in client folder
make commit on each step or feature
MAKE A LIST OF ALL THE CHANGES TO BE DONE IN REACT APP TO INTEGRATE THIS NEW FLOW IN pmwdsA-ui-integration.md file
list names, paths of every component and what part or api or api data or json response needs to change and in which component with proper explanation 
numbered list
DO NOT RUN TEST FROM PROJECT

DO NOT STOP TILL DONE

## analyse - report-backend-ds.md
analyse the project for backend and how flow and scopes and roles and permissions are managed, hierarchy for roles , models intefaces repository dto 
controllers sending data for what api and any page specific api that send all data role wise with single api while keeping the other api as it is 

workflow ( for example in current implementation we have organizations -> departments(multiple) -> projects (multiple) -> milestones ( multiple) -> tasks(multiple) -> sub tasks(multiple) 
user assignment to these role wise

generate a full comprehensive report while also mentioning the file names where it is implements with path,
and suggest improvements or better way  to manage it ( refactor, api improvements , models interface dto etc improvemetns, security etc )

note - skip  ai related stuff, skip knowledge , webhooks and integrations, dashboards and widgets etc
only make reports for : projects, organization, departments , milestones, tasks, subtasks, notifications, users, profile , roles , activity logs , auth 

do not miss anything for the project

## analyse frontend - report-frontend-ds.md
analyse client react project agenerate a full comprehensive report while also mentioning the file names where it is implements with path,
and suggest improvements or better way  to manage it ( refactor, api improvements , models interface dto etc improvemetns, security etc )

check all api and data incosistencies and all interface declarations and color declation and all dummy data , notice inconsistencies of ui and colors and interfaces defined on several places instead of one place and for dummy data also

also check for location inconsistencies and other things which can be improved, like moving all modals at same place with proper naming and check for all other issues

## API
- CREATE ONE MORE API THAT SENDS ALL DATA (ROLE SPECIFIC FOR LOGGED IN USER (end point - pages , returns all the data that we send through all get api to frontend for all pages and features in single api , make sure the data is paginanted only 20 records for everythings are sent when the user pagintion settings are for 10 i.e we send double of what users settings are )

## prompt rolescope fixes
- [rolescopes-back.md](rolescopes-back.md) contains all the issues we need to fix.
NOTE : ONLY CONSIDER THESE FOR ANY CHANGES Auth, Users, Profiles, Roles/Permissions, Organizations, Departments, Projects, Milestones, Tasks (with subtasks), Notifications, Activity Logs, 
NOTE IMP - DO NOT STOP TILL DONE
fix all these issues and update the document  list all the issues and mentions all the changes

- there are duplicate permissions in permissions like the USERS.PROFILE_PICTURE.MANAGE USER_PROFILE_PICTURE_MANAGE , USERS.DEPARTMENTS.MANAGE USER_DEPARTMENT_MANAGE , SYSTEM.ADMIN SYSTEM_ADMIN , SYSTEM.DATABASE.VIEW SYSTEM_DATABASE_VIEW 
similarly  for all these Auth, Users, Profiles, Roles/Permissions, Organizations, Departments, Projects, Milestones, Tasks (with subtasks), Notifications, Activity Logs 

check permissions and duplicates related to all these modules and fix it. 

- each module has a manage global scope ( which has all the permission related to that module, and if that scope is assigned to any role we do not need to separately assign other scoped permissions)
- fix all global and scoped permissions (all superadmin only permission will be global)

- if a role is assigned global manage permission (it mean means it contains all other crud and other permission related to that module, no need to separately mention other permissions for that)

- roles and permission controller and pages controller sends the data related to other modules like the ( integration, web hooks, dasbboards, knowledge ) hide this for now, we do not need to send these now

- only data related to Auth, Users, Profiles, Roles/Permissions, Organizations, Departments, Projects, Milestones, Tasks (with subtasks), Notifications, Activity Logs  


