<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\Role;
use App\Models\Skill;
use App\Models\User;
use App\Support\PasswordHasher;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    private const SEED_USER = 'system-seed';

    private const DEFAULT_PASSWORD = 'Pmwds@123';

    public function run(): void
    {
        $this->seedOrganizations();
        $this->seedDepartments();
        $this->seedPermissions();
        $this->seedRoles();
        $this->seedSkills();
        $this->seedUsers();
        $this->seedProjects();
    }

    private function seedOrganizations(): void
    {
        $orgs = [
            ['PMWDS Global', 'PMWDS-001', '12 Delivery Avenue, Bengaluru', 'contact@pmwds.com'],
            ['Northwind Delivery Labs', 'NDL-2026', '400 Lakeview Drive, Austin', 'ops@northwind-labs.example'],
            ['Contoso Transformation Office', 'CTO-7781', '9 Market Street, London', 'hello@contoso-transform.example'],
        ];

        foreach ($orgs as [$name, $tax, $address, $email]) {
            Organization::firstOrCreate(
                ['name' => $name],
                [
                    'tax_id' => $tax,
                    'address' => $address,
                    'contact_email' => $email,
                    'created_by' => self::SEED_USER,
                ]
            );
        }
    }

    private function seedDepartments(): void
    {
        $pmwds = Organization::where('name', 'PMWDS Global')->first();
        $ndl = Organization::where('name', 'Northwind Delivery Labs')->first();
        $cto = Organization::where('name', 'Contoso Transformation Office')->first();

        $specs = [
            [$pmwds?->id, 'Engineering', 'ENG', 'Product engineering and platform delivery', 38],
            [$pmwds?->id, 'Program Management', 'PMO', 'Portfolio governance', 14],
            [$ndl?->id, 'Engineering', 'ENG', 'Client implementation squads', 24],
            [$ndl?->id, 'Operations', 'OPS', 'Service operations', 18],
            [$cto?->id, 'Strategy', 'STR', 'Transformation strategy', 12],
        ];

        foreach ($specs as [$orgId, $name, $code, $desc, $cap]) {
            if (! $orgId) {
                continue;
            }
            Department::firstOrCreate(
                ['organization_id' => $orgId, 'code' => $code],
                [
                    'name' => $name,
                    'description' => $desc,
                    'max_capacity' => $cap,
                    'created_by' => self::SEED_USER,
                ]
            );
        }
    }

    private function seedPermissions(): void
    {
        $specs = [
            ['AUTH.MANAGE', 'Manage Authentication', 'Authentication', true],
            ['USERS.MANAGE', 'Manage Users', 'Users', true],
            ['ROLES.MANAGE', 'Manage Roles', 'Authentication', true],
            ['ORGS.MANAGE', 'Manage Organizations', 'Organization', true],
            ['PROJECTS.MANAGE', 'Manage Projects', 'Projects', false],
            ['TASKS.MANAGE', 'Manage Tasks', 'Tasks', false],
            ['KNOWLEDGE.MANAGE', 'Manage Knowledge', 'Knowledge', false],
            ['INTEGRATIONS.MANAGE', 'Manage Integrations', 'Integrations', true],
            ['REPORTS.MANAGE', 'Manage Reports', 'Reports', false],
            ['SYSTEM.ADMIN', 'System Administration', 'System', true],
            ['SYSTEM.DATABASE.VIEW', 'View Database Status', 'System', true],
            ['AI.SETTINGS.MANAGE', 'Manage AI Settings', 'AI', true],
            ['USERS.PROFILE_PICTURE.MANAGE', 'Manage Profile Pictures', 'Users', false],
            ['USERS.DEPARTMENTS.MANAGE', 'Manage User Departments', 'Users', false],
            ['ACTIVITY_LOGS.VIEW', 'View Activity Logs', 'Audit', true],
        ];

        foreach ($specs as [$code, $name, $module, $isSystem]) {
            Permission::firstOrCreate(
                ['code' => $code],
                [
                    'name' => $name,
                    'description' => $name,
                    'module' => $module,
                    'is_system' => $isSystem,
                    'created_by' => self::SEED_USER,
                ]
            );
        }
    }

    private function seedRoles(): void
    {
        $permissions = Permission::all()->keyBy('code');
        $map = [
            'SuperAdmin' => ['level' => 100, 'perms' => $permissions->keys()->all()],
            'Director' => ['level' => 90, 'perms' => ['USERS.MANAGE', 'ORGS.MANAGE', 'PROJECTS.MANAGE', 'TASKS.MANAGE', 'KNOWLEDGE.MANAGE', 'REPORTS.MANAGE', 'USERS.PROFILE_PICTURE.MANAGE', 'USERS.DEPARTMENTS.MANAGE', 'ACTIVITY_LOGS.VIEW']],
            'ProjectManager' => ['level' => 80, 'perms' => ['PROJECTS.MANAGE', 'TASKS.MANAGE', 'REPORTS.MANAGE', 'KNOWLEDGE.MANAGE']],
            'DepartmentHead' => ['level' => 70, 'perms' => ['USERS.MANAGE', 'PROJECTS.MANAGE', 'REPORTS.MANAGE']],
            'TeamMember' => ['level' => 40, 'perms' => ['TASKS.MANAGE']],
            'Viewer' => ['level' => 10, 'perms' => []],
        ];

        foreach ($map as $name => $cfg) {
            $role = Role::firstOrCreate(
                ['name' => $name],
                ['description' => $name, 'level' => $cfg['level'], 'created_by' => self::SEED_USER]
            );
            $permIds = collect($cfg['perms'])->map(fn ($c) => $permissions[$c]->id ?? null)->filter()->all();
            $role->permissions()->syncWithoutDetaching($permIds);
        }
    }

    private function seedSkills(): void
    {
        foreach (['C#', '.NET', 'React', 'SQL Server', 'Project Management', 'Agile', 'DevOps'] as $skill) {
            Skill::firstOrCreate(['name' => $skill], [
                'category' => 'Technical',
                'description' => $skill,
                'created_by' => self::SEED_USER,
            ]);
        }
    }

    private function seedUsers(): void
    {
        $dept = Department::where('code', 'ENG')->first();
        $roles = Role::all()->keyBy('name');

        $users = [
            ['admin@pmwds.com', 'Super', 'Admin', 'ADMIN001', 'SuperAdmin'],
            ['director@pmwds.com', 'Alex', 'Director', 'DIR001', 'Director'],
            ['manager@pmwds.com', 'Morgan', 'Manager', 'PM001', 'ProjectManager'],
            ['head@pmwds.com', 'Harper', 'Head', 'DH001', 'DepartmentHead'],
            ['member@pmwds.com', 'Jamie', 'Member', 'TM001', 'TeamMember'],
            ['viewer@pmwds.com', 'Riley', 'Viewer', 'VW001', 'Viewer'],
        ];

        foreach ($users as [$email, $first, $last, $code, $roleName]) {
            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'first_name' => $first,
                    'last_name' => $last,
                    'employee_code' => $code,
                    'job_title' => $roleName,
                    'department_id' => $roleName === 'SuperAdmin' ? null : $dept?->id,
                    'organization_id' => $roleName === 'SuperAdmin' ? null : $dept?->organization_id,
                    'created_by' => self::SEED_USER,
                ]
            );
            $user->password_hash = PasswordHasher::hash(self::DEFAULT_PASSWORD, $user->id);
            $user->save();
            if ($roles->has($roleName)) {
                $user->roles()->syncWithoutDetaching([$roles[$roleName]->id]);
            }
        }
    }

    private function seedProjects(): void
    {
        $dept = Department::where('code', 'ENG')->first();
        $manager = User::where('email', 'manager@pmwds.com')->first();
        if (! $dept || ! $manager) {
            return;
        }

        $project = Project::firstOrCreate(
            ['project_code' => 'PMWDS-2026-01'],
            [
                'name' => 'PMWDS Platform Modernization',
                'description' => 'Core platform delivery',
                'category' => 'Software',
                'status' => 'Active',
                'priority' => 'High',
                'planned_start_date' => now()->subMonths(2),
                'planned_end_date' => now()->addMonths(4),
                'planned_budget' => 250000,
                'department_id' => $dept->id,
                'project_manager_id' => $manager->id,
                'progress_percentage' => 35,
                'created_by' => self::SEED_USER,
            ]
        );

        ProjectTask::firstOrCreate(
            ['project_id' => $project->id, 'title' => 'Laravel API parity'],
            [
                'status' => 'InProgress',
                'priority' => 'High',
                'start_date' => now()->subWeek(),
                'due_date' => now()->addWeeks(2),
                'assigned_to_user_id' => User::where('email', 'member@pmwds.com')->value('id'),
                'estimated_hours' => 40,
                'progress_percentage' => 50,
                'created_by' => self::SEED_USER,
            ]
        );
    }
}
