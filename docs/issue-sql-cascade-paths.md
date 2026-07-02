# SQL Server Multiple Cascade Paths

## Error
```
Introducing FOREIGN KEY constraint 'FK_Milestones_Projects_ProjectId' on table 'Milestones'
may cause cycles or multiple cascade paths. Specify ON DELETE NO ACTION or ON UPDATE NO ACTION,
or modify other FOREIGN KEY constraints.
```

## Root Cause
SQL Server does not allow multiple cascade paths to the same table. The EF model had:

- `Project → Milestones` (`ON DELETE CASCADE`)
- `ProjectDepartment → Department` (`ON DELETE CASCADE`)
- `Department → Milestones` (`ON DELETE SET NULL`)

SQL Server detected that deleting a Department could cascade through ProjectDepartments to Project, then to Milestones — while Milestones also references Department with a cascading action (`SET NULL`). This violates SQL Server's "no multiple cascade paths" rule (error 1785).

## Fix

### `PMWDS.Persistence/Configurations/ProjectConfiguration.cs`
Milestones → Project FK changed from `Cascade` to `NoAction`. Cascade deletes for milestones should be handled in application code (soft delete pattern).

### `PMWDS.Persistence/Configurations/ProjectDepartmentConfiguration.cs`
DepartmentId FK changed from `Cascade` to `NoAction`. As a join table, cascade deletes are unnecessary — the app manages these records.

## Affected Tables
- `Milestones` — FK to `Projects` now `NO ACTION`
- `ProjectDepartments` — FK to `Departments` now `NO ACTION`
