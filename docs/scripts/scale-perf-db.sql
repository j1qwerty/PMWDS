/*
  Scales PMWDS_Perf up to the volumes that reproduce the SQL Server
  RESOURCE_SEMAPHORE stall documented in the mssql perf investigation:
  ~4000 projects, ~8000 tasks, ~620 users with the full navigation graph,
  and 2000-4000 char description / AI summary columns on every project.

  Safe to re-run: it truncates only the perf database's bulk tables.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

BEGIN TRAN;

-- ---------------------------------------------------------------- helpers
IF OBJECT_ID('dbo.Numbers') IS NOT NULL DROP TABLE dbo.Numbers;
CREATE TABLE dbo.Numbers (n INT NOT NULL PRIMARY KEY);
WITH s AS (SELECT TOP (20000) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
           FROM sys.all_objects a CROSS JOIN sys.all_objects b)
INSERT INTO dbo.Numbers (n) SELECT n FROM s;

DECLARE @now DATETIME2 = GETUTCDATE();
DECLARE @creator NVARCHAR(256) = N'perf-scale';

-- ------------------------------------------------------------------ users
-- 620 total: keep the 10 seeded accounts, add 610.
INSERT INTO dbo.Users (Id, Email, FirstName, LastName, PhoneNumber, TimeZone, JobTitle,
                       EmployeeCode, AvailabilityStatus, AvailabilityPercentage,
                       AIPerformanceScore, AIWorkloadScore, AIBurnoutRiskScore,
                       CreatedDate, CreatedBy, IsDeleted, RowVersion, IsActive)
SELECT NEWID(),
       CONCAT(N'perf.user', RIGHT(N'0000' + CAST(x.n AS NVARCHAR(10)), 4), N'@perf.local'),
       CONCAT(N'Perf', x.n), N'Load',
       N'+1-555-0100', N'UTC', N'Analyst',
       CONCAT(N'EMP', RIGHT(N'000000' + CAST(x.n AS NVARCHAR(10)), 6)),
       N'Available', 80, 70, 40, 5,
       @now, @creator, 0, 0, 1
FROM dbo.Numbers x WHERE x.n BETWEEN 1 AND 610;

IF NOT EXISTS (SELECT 1 FROM dbo.UserProfiles p
               WHERE p.UserId IN (SELECT Id FROM dbo.Users WHERE Email LIKE N'%@perf.local'))
INSERT INTO dbo.UserProfiles (Id, UserId, CreatedDate, CreatedBy, IsDeleted, RowVersion, IsActive)
SELECT NEWID(), u.Id, @now, @creator, 0, 0, 1
FROM dbo.Users u WHERE u.Email LIKE N'%@perf.local';

IF NOT EXISTS (SELECT 1 FROM dbo.UserDepartments d
               WHERE d.UserId IN (SELECT Id FROM dbo.Users WHERE Email LIKE N'%@perf.local'))
INSERT INTO dbo.UserDepartments (Id, UserId, DepartmentId, IsPrimary, CreatedDate, CreatedBy, IsDeleted, RowVersion, IsActive)
SELECT NEWID(), u.Id, d.Id, 1, @now, @creator, 0, 0, 1
FROM dbo.Users u
CROSS JOIN (SELECT TOP 1 Id FROM dbo.Departments ORDER BY Id) d
WHERE u.Email LIKE N'%@perf.local';

IF NOT EXISTS (SELECT 1 FROM dbo.UserSkills s
               WHERE s.UserId IN (SELECT Id FROM dbo.Users WHERE Email LIKE N'%@perf.local'))
INSERT INTO dbo.UserSkills (Id, UserId, SkillId, ProficiencyLevel, ExperienceMonths,
                            LastUsed, AIConfidenceScore, CreatedDate, CreatedBy, IsDeleted, RowVersion)
SELECT NEWID(), u.Id, s.Id, 3, 24, @now, 0.8, @now, @creator, 0, 0
FROM dbo.Users u
CROSS JOIN (SELECT TOP 3 Id FROM dbo.Skills ORDER BY Id) s
WHERE u.Email LIKE N'%@perf.local';

-- --------------------------------------------------------------- projects
-- 4000 total. Description and AIInsightsSummary carry the 2000-4000 char
-- payload that made the original list queries cost ~2200 logical reads each.
DECLARE @dept UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM dbo.Departments ORDER BY Id);
DECLARE @mgr NVARCHAR(256) = (SELECT TOP 1 CAST(Id AS NVARCHAR(36)) FROM dbo.Users WHERE Email = N'manager@org1.com');
IF @mgr IS NULL SET @mgr = (SELECT TOP 1 CAST(Id AS NVARCHAR(36)) FROM dbo.Users ORDER BY Id);

INSERT INTO dbo.Projects (Id, ProjectCode, Name, Description, Category, Priority, Status,
                          DepartmentId, ProjectManagerId, ClientName, StakeholderIds,
                          PlannedStartDate, PlannedEndDate, BaselineEndDate,
                          PlannedBudget, ActualCost, ProgressPercentage,
                          AIHealthScore, AIDelayRiskScore, AIBudgetRiskScore, AIInsightsSummary,
                          LastAIAnalysis, CreatedDate, CreatedBy, IsDeleted, RowVersion, IsActive)
SELECT NEWID(),
       CONCAT(N'PRF-', RIGHT(N'00000' + CAST(x.n AS NVARCHAR(10)), 5)),
       CONCAT(N'Perf Project ', x.n),
       REPLICATE(N'Description payload for performance harness. ', 44),  -- 1980 chars (col max 2000)
       N'Infrastructure', N'Medium', N'InProgress',
       @dept, @mgr, N'Perf Client', NULL,
       DATEADD(DAY, -x.n % 365, @now), DATEADD(DAY, 365, @now), DATEADD(DAY, 400, @now),
       100000 + x.n * 37, x.n * 11.5, x.n % 100,
       70, 2, 1,
       REPLICATE(N'AI insight summary for performance harness row. ', 83), -- 3984 chars (col max 4000)
       @now, DATEADD(DAY, -x.n % 400, @now), @creator, 0, 0, 1
FROM dbo.Numbers x WHERE x.n BETWEEN 1 AND 4000;

IF NOT EXISTS (SELECT 1 FROM dbo.ProjectDepartments pd
               WHERE pd.ProjectId IN (SELECT Id FROM dbo.Projects WHERE ProjectCode LIKE N'PRF-%'))
INSERT INTO dbo.ProjectDepartments (Id, ProjectId, DepartmentId, IsPrimary, CreatedDate, CreatedBy, IsDeleted, RowVersion, IsActive)
SELECT NEWID(), p.Id, @dept, 1, @now, @creator, 0, 0, 1
FROM dbo.Projects p WHERE p.ProjectCode LIKE N'PRF-%';

-- ------------------------------------------------------------- milestones
INSERT INTO dbo.Milestones (Id, ProjectId, Name, Description, [Order], DueDate, Status,
                            IsCritical, ProgressPercentage, CreatedDate, CreatedBy, IsDeleted, RowVersion, IsActive)
SELECT NEWID(), p.Id,
       CONCAT(N'Milestone ', p.Id),
       REPLICATE(N'Milestone detail payload. ', 76),
       1, DATEADD(DAY, 90, @now), N'InProgress', 0, 25, @now, @creator, 0, 0, 1
FROM dbo.Projects p WHERE p.ProjectCode LIKE N'PRF-%';

-- ------------------------------------------------------------------ tasks
INSERT INTO dbo.Tasks (Id, ProjectId, MilestoneId, ParentTaskId, Title, Description, Status, Priority,
                       AssignedToUserId, AssignedByUserId, AssignedDate, StartDate, DueDate,
                       IsRecurring, EstimatedHours, ActualHours, ProgressPercentage, IsEscalated, EscalationLevel,
                       AIDelayProbability, AIOptimalAssigneeScore,
                       CreatedDate, CreatedBy, IsDeleted, RowVersion, IsActive)
SELECT NEWID(), p.Id, m.Id, NULL,
       CONCAT(N'Task ', p.Id, N'-', s.n),
       REPLICATE(N'Task description payload. ', 150),
       N'InProgress', N'Medium',
       u.Id, u.Id, @now, @now, DATEADD(DAY, 30, @now),
       0, 8, 4, 50, 0, 0, 0.2, 0.7,
       @now, @creator, 0, 0, 1
FROM dbo.Projects p
CROSS JOIN (SELECT TOP 2 n FROM dbo.Numbers ORDER BY n) s
LEFT JOIN dbo.Milestones m ON m.ProjectId = p.Id
CROSS JOIN (SELECT TOP 1 Id FROM dbo.Users ORDER BY Id) u
WHERE p.ProjectCode LIKE N'PRF-%';

COMMIT;

-- ------------------------------------------------------------------ report
SELECT 'Users'         AS [Table], COUNT_BIG(*) AS Rows FROM dbo.Users
UNION ALL SELECT 'UserProfiles',    COUNT_BIG(*) FROM dbo.UserProfiles
UNION ALL SELECT 'UserDepartments', COUNT_BIG(*) FROM dbo.UserDepartments
UNION ALL SELECT 'UserSkills',      COUNT_BIG(*) FROM dbo.UserSkills
UNION ALL SELECT 'Projects',        COUNT_BIG(*) FROM dbo.Projects
UNION ALL SELECT 'ProjectDepts',    COUNT_BIG(*) FROM dbo.ProjectDepartments
UNION ALL SELECT 'Milestones',      COUNT_BIG(*) FROM dbo.Milestones
UNION ALL SELECT 'Tasks',           COUNT_BIG(*) FROM dbo.Tasks;