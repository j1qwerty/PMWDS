- errors
- sqlite
- 
## remaining
- verify all such that no api creates anything if it already exists.
### proejct
- {{baseUrl}}/projects/{{projectId}}/ai/health
- {{baseUrl}}/projects/{{projectId}}/ai/insights
- {{baseUrl}}/projects/{{projectId}}/ai/optimize-resources api works but no sugesions or action plan
- {{baseUrl}}/users/register - user created even with same email



## changes
- Skills api missing - crud 
- user update skill 
- user remove skill
- logic for auth/refresh api
- /Auth/change-password logic 
- create department api - unique department code before creating new department with same code
- {{baseUrl}}/projects/{{projectId}} - GetProjectDetailsQueryHandler.cs - Changed from using AutoMapper (which had no mapping profile configured) to using the static ProjectDto.FromEntity(project) method, matching how other working endpoints work.

- {{baseUrl}}/projects/{{projectId}}/documents - Root cause: The AzureBlobStorageService was trying to connect to Azure Blob Storage when ConnectionString = "UseDevelopmentStorage=true". Azure's BlobServiceClient doesn't support that magic string - it hangs indefinitely waiting for a connection that will never succeed.

Fix: Added local file storage fallback in AzureBlobStorageService. When the connection string is empty, or contains UseDevelopmentStorage or UseLocal, files are stored locally instead.

Root cause: BaseRepository.UpdateAsync was using _dbSet.Update(entity) which tells EF Core to mark the entire entity graph as modified. Since GetWithDetailsAsync loaded the Project WITH all its related Tasks, Milestones, Documents etc., EF tried to UPDATE all those rows too. SQLite with EF Core's batch executor gets confused by the cascade and hits 0 affected rows → concurrency exception.

Fix in BaseRepository.cs: Changed from:

_dbSet.Update(entity);  // Marks entire entity graph for update
to:

_context.Entry(entity).State = EntityState.Modified;  // Only marks the root entity
EF Core already knows which properties changed (through change tracking) - it just needed the root entity flagged, not the entire graph reset. Restart the API and try the upload again.
Root cause: GetWithDetailsAsync loads the entire Project entity graph (Milestones → Tasks, Documents, etc.). When you call _uow.Projects.UpdateAsync(project) on a graph-root entity with all those relations loaded, EF Core's batch executor with SQLite gets confused and issues a DELETE for every navigation item that evaluates to 0 rows.

Fix (2 changes):

ProjectsController.UploadDocument - Changed to use GetByIdAsync (lightweight, no navigation loading) instead of GetWithDetailsAsync, and creates the ProjectDocument independently via AddAsync instead of attaching it to the project and updating the whole graph.
UnitOfWork - Added `IRepository

Each operation is wrapped in try/catch individually, so:

Upload: Azure first → local fallback if Azure fails
Download: Azure first → local fallback if Azure fails (then throw if not found locally)
Delete: Tries Azure first → local if Azure fails (no throw if not found)
Local fallback path: `App_Data/Files/pmwds-files

- {{baseUrl}}/users/{{userId}}/skills Root cause: Same as before - user.AddSkill() creates a UserSkill on the User entity's collection. When UpdateAsync(user) is called, it marks the entire graph for update, and EF does an UPDATE UserSkills instead of INSERT because the entity is already tracked.

Fix: Added IUnitOfWork.UserSkills repository and changed AddSkill to add the UserSkill directly via AddAsync, bypassing the entity graph update entirely.

- {{baseUrl}}/tasks  - Root cause: TaskRepository.GetWithDetailsAsync had .ThenInclude(a => a.User) - but EF Core can't navigate to User on TaskAssignment because the navigation path isn't recognized by the model. The task was being created successfully, but the subsequent AI call (PredictTaskDelayAsync) calls GetWithDetailsAsync which fails before returning the response.

Fix: Removed .ThenInclude(a => a.User) from GetWithDetailsAsync. The Assignments are loaded without the nested User navigation - the task data is sufficient for AI prediction.

- {{baseUrl}}/tasks/{{taskId}}/assign - Root cause: Same pattern as before - UpdateAsync(task) on an entity with navigation collections. task.AssignTo() creates a new TaskAssignment on the graph, and calling _uow.Tasks.UpdateAsync(task) makes EF try to manage the entire collection, including existing assignments from the DB.

Fix: Removed UpdateAsync(task) call. task.AssignTo() directly modifies the scalar properties (AssignedToUserId, AssignedDate, Status) and only needs SaveChangesAsync - no explicit UpdateAsync required.
ProjectTask.AssignTo() - Removed _assignments.Add(TaskAssignment.Create(...)). Now only updates scalar fields (AssignedToUserId, AssignedByUserId, AssignedDate, Status) and fires the domain event. No longer touches the _assignments collection.
AssignTaskCommandHandler - Explicitly creates the TaskAssignment via TaskAssignments.AddAsync() instead of relying on entity graph tracking.
IUnitOfWork / UnitOfWork - Added TaskAssignments repository for clean standalone management.
BaseRepository.UpdateAsync() - Fixed to use Entry(entity).State = Modified instead of _dbSet.Update(entity) which was marking the entire graph.
This breaks the recurring pattern: never use entity collection methods (_nav.Add()) inside a domain entity method when the entity has been loaded from the DbContext — it creates phantom entries that conflict with existing tracked entities. Always manage join/assignment entities via their own repository.

- 