# PMWDS .NET Architecture Audit Report

**Date:** July 3, 2026
**Auditor:** PMWDS Architecture Auditor
**Scope:** PMWDS solution (7 projects, 43+ domain entities)

---

## 1. Executive Summary

**Overall Health: YELLOW (Moderate Risk)**

The PMWDS solution is a large Clean Architecture project with a well-intentioned structure but suffers from several architectural anti-patterns. The domain layer is reasonably rich, but significant God Interfaces, Service Locator, Layering Violations, Giant Controllers, and Anemic Event Handling reduce maintainability.

## 2. Project Structure & Dependency Analysis

### Dependency Flow
- Domain <- no references (innermost)
- Application <- references Domain only
- Persistence <- references Application, Domain
- Infrastructure <- references Application, Domain
- API (Composition Root) <- references all 5 projects
- AI (standalone executable) <- references Application, Domain, Infrastructure, Persistence

### Verdict: No circular dependencies detected. Dependency direction is correct.

---

## 3. SOLID Principles Violations

### 3.1 Interface Segregation (ISP) -- CRITICAL

**Issue: God IAIService Interface**
- File: PMWDS.Application/Interfaces/Services/IAIService.cs
- 30+ methods covering: recommendations, predictions, health analysis, model management, training data, chat, provider management
- Every consumer must implement all 30+ methods
- **Fix**: Split into: IRecommendationService, IPredictionService, IProjectHealthService, IModelManagementService, IChatService

**Issue: God IUnitOfWork Interface**
- File: PMWDS.Application/Interfaces/Services/IUnitOfWork.cs
- 34 repository properties + 4 transaction methods
- Every consumer gets ALL repositories
- **Fix**: Use IApplicationDbContext instead, inject specific repository interfaces

### 3.2 Service Locator (DIP Violation) -- CRITICAL
- File: PMWDS.API/Controllers/BaseApiController.cs (line 14)
- Pattern: _mediator ??= HttpContext.RequestServices.GetRequiredService<IMediator>()
- **Fix**: Inject IMediator via constructor in each controller

### 3.3 Redundant Shadow Interfaces (DIP)
- File: PMWDS.Infrastructure/Services/AuditService.cs
- File: PMWDS.Infrastructure/Services/CacheService.cs
- Infrastructure classes define interfaces that mirror Application interfaces
- **Fix**: Remove shadow interfaces; implement Application interfaces directly

### 3.4 Open/Closed Principle
- Status update logic in Project.cs and ProjectTask.cs uses switch statements
- Adding new status requires modifying existing code
- **Fix**: Consider state pattern for status management

---

## 4. Layering Violations

### 4.1 Domain Layer References Framework Packages -- VIOLATION
- File: PMWDS.Domain/PMWDS.Domain.csproj
- References: Microsoft.AspNetCore.Identity.EntityFrameworkCore, FluentValidation
- Domain should be pure C# with zero framework dependencies
- **Fix**: Remove Identity package; move FluentValidation to Application layer

### 4.2 Application Layer References HTTP Abstractions -- VIOLATION
- File: PMWDS.Application/PMWDS.Application.csproj
- References: Microsoft.AspNetCore.Http.Abstractions
- Application should not depend on ASP.NET
- **Fix**: Remove HTTP package; use application-specific abstractions

### 4.3 Controllers Bypass Application Layer -- VIOLATION
- ProjectsController directly uses ApplicationDbContext (lines 52, 91, 149, 412, 470, 502)
- ProjectsController directly uses IUnitOfWork (lines 247, 307, 361, 399, 425)
- ProjectsController directly uses IAIService (lines 288, 300)
- TasksController directly uses ApplicationDbContext for queries
- **Fix**: Route all data access through CQRS MediatR handlers

---

## 5. DI & Coupling Issues

### 5.1 Constructor Over-Injection
- ProjectsController: 6 dependencies (IUnitOfWork, IAIService, ICurrentUserService, ILocalFileStorageService, RoleScopeService, ApplicationDbContext)
- TasksController: 6 dependencies (IUnitOfWork, ICurrentUserService, INotificationService, IFileStorageService, RoleScopeService, ApplicationDbContext)
- **Fix**: Extract facade services, reduce controller responsibilities

### 5.2 Synchronous Blocking on Async
- File: PMWDS.API/Controllers/TasksController.cs (line 581)
- Code: .Result.FirstOrDefault() -- blocks async thread
- **Fix**: Use proper await

### 5.3 Implicit Transactions
- File: PMWDS.Application/Features/Tasks/Commands/CreateTaskCommand.cs
- Two SaveChangesAsync calls without explicit transaction
- If second save fails, first is committed
- **Fix**: Wrap in explicit transaction scope

---

## 6. CQRS / MediatR Usage

### 6.1 Incomplete CQRS Coverage
- Tasks: 4 commands, 0 queries (all queries done directly in controllers)
- Users: 0 commands, 1 query
- **Fix**: Create query handlers for task operations

### 6.2 Commands Calling Queries
- File: PMWDS.Application/Features/Tasks/Commands/CreateTaskCommand.cs (line 76)
- CreateTaskCommand handler directly calls AI service for prediction
- **Fix**: Queue AI prediction as background job or domain event

### 6.3 Missing FluentValidation
- FluentValidation is referenced but no validators found for commands/queries
- **Fix**: Add validators for all command/query records

---

## 7. Repository Pattern

### 7.1 Redundant Generic Repository -- VIOLATION
- File: PMWDS.Persistence/Repositories/BaseRepository.cs
- Thin wrapper over EF Core DbSet (FindAsync, ToListAsync, Where, AddAsync)
- Adds no value; increases indirection
- **Fix**: Consider removing; expose DbSet through IApplicationDbContext

### 7.2 God IUnitOfWork -- CRITICAL
- 34 repositories exposed through a single interface
- Couples all consumers to the entire data model
- **Fix**: Follow Interface Segregation; inject specific repositories

### 7.3 Specific Repositories Are Good
- IProjectRepository, ITaskRepository, IUserRepository add domain-specific methods
- These should be kept; the generic IRepository should be removed

---

## 8. Domain Design

### 8.1 Rich Domain Model -- POSITIVE
- Project.cs (278 lines), ProjectTask.cs (262 lines) contain real business logic
- Factory methods, state validation, progress calculation
- Domain events raised within domain methods

### 8.2 Domain Events Not Dispatched -- CRITICAL
- Events are collected in _domainEvents but NEVER dispatched to handlers
- File: PMWDS.API/Program.cs -- no domain event dispatching configured
- **Fix**: Integrate with MediatR; dispatch events after SaveChanges

### 8.3 Unused ValueObject Base Class
- File: PMWDS.Domain/Common/ValueObject.cs
- Base class defined but zero value objects created
- **Fix**: Create value objects (Email, DateRange, Money, etc.)

### 8.4 AuditableEntity Design
- Notes, Tags, IsActive added to ALL entities via AuditableEntity
- Not all entities need these; IsActive conflicts with IsDeleted
- **Fix**: Consider composition over inheritance

---

## 9. Controller Analysis

### 9.1 Giant Controllers
| Controller | Lines | Verdict |
|------------|-------|---------|
| TasksController.cs | 1244 | CRITICAL - God Controller |
| ProjectsController.cs | 509 | Large |
| AIController.cs | 459 | Large |

**TasksController** (1244 lines) handles:
- Task CRUD, status, progress, assignment
- Comments, attachments, time tracking, dependencies
- Subtasks (full CRUD), escalations, AI predictions
- 8 private methods with business logic

### 9.2 Business Logic in Controllers
- RecalculateTaskMilestoneAsync, RecalculateProjectFromMilestonesAsync
- ApplyStatusChangeAsync, IsUserInProjectOrganizationAsync
- Should be in Application or Domain layer

### 9.3 DTOs Defined in Controllers
- UpdateProjectStatusRequest, UpdateTaskStatusRequest
- AssignTaskRequest, AddCommentRequest, StartTimerRequest
- ChatRequest, ProviderTestRequest, RejectRecommendationRequest
- **Fix**: Move to PMWDS.Application/DTOs

---

## 10. Middleware & Pipeline

### 10.1 Exception Middleware -- Correct Position
- Registered first in pipeline (line 187)

### 10.2 SerilogRequestLogging -- Wrong Position
- After static file middleware (line 217)
- Static file requests not logged

### 10.3 Static Classes
- 19 static classes in solution
- DatabaseConnectionService (427 lines) -- untestable static infrastructure
- PermissionPolicyRegistry, SeedData, 11+ seeder classes
- **Fix**: Convert to injectable services

---

## 11. Infrastructure & AI Layer

### 11.1 Good AI Service Partitioning
- Uses partial classes (AIService.Analysis.cs, etc.)
- But still implements all 30+ methods from God IAIService

### 11.2 Good Hangfire Job Pattern
- Clean dependency injection pattern for background jobs

### 11.3 Azure/Local File Storage Hybrid
- Pragmatic fallback design; class is 208 lines

---

## 12. Critical Issues Summary

### CRITICAL (Must Fix)
1. Service Locator in BaseApiController
2. God IAIService Interface (30+ methods)
3. God IUnitOfWork Interface (34 repositories)
4. Giant TasksController (1244 lines)
5. Domain events never dispatched
6. Synchronous .Result blocking call

### HIGH PRIORITY
7. Controllers bypassing CQRS layer
8. Redundant generic repository over EF Core
9. Domain referencing ASP.NET Identity
10. Application referencing HTTP Abstractions
11. Missing task query handlers
12. Business logic in controller private methods

### MEDIUM PRIORITY
13. Multiple SaveChanges without transaction
14. Redundant shadow interfaces
15. DTOs in controller files
16. 19 static classes (untestable)
17. Unused ValueObject base class
18. JSON fields as strings

### NICE TO HAVE
19. Missing FluentValidation validators
20. SerilogRequestLogging placement
21. Error details in dev mode
22. Constructor over-injection

---

## Scores

| Category | Score |
|----------|-------|
| SOLID Compliance | 4/10 |
| Project Dependencies | 9/10 |
| DI Usage | 5/10 |
| CQRS Separation | 6/10 |
| Domain Richness | 8/10 |
| Layering Discipline | 4/10 |
| Controller Quality | 3/10 |
| Testability | 4/10 |
| **OVERALL** | **5.4/10** |
