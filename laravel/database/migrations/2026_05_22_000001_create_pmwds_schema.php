<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');

        $audit = function (Blueprint $table, bool $withActive = true): void {
            $table->timestamp('created_date')->useCurrent();
            $table->timestamp('modified_date')->nullable();
            $table->string('created_by', 100)->default('system');
            $table->string('modified_by', 100)->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->integer('row_version')->default(1);
            $table->text('notes')->nullable();
            $table->text('tags')->nullable();
            if ($withActive) {
                $table->boolean('is_active')->default(true);
            }
        };

        Schema::create('organizations', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('name', 200);
            $table->string('tax_id', 50)->nullable();
            $table->string('address', 500)->nullable();
            $table->string('contact_email', 200)->nullable();
            $table->string('contact_phone', 50)->nullable();
            $table->date('established_date')->nullable();
            $audit($table);
        });

        Schema::create('departments', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->nullable();
            $table->uuid('parent_department_id')->nullable();
            $table->uuid('head_user_id')->nullable();
            $table->string('name', 200);
            $table->string('code', 50);
            $table->text('description')->nullable();
            $table->integer('max_capacity')->default(0);
            $audit($table);
            $table->index(['organization_id', 'code']);
        });

        Schema::create('permissions', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('code', 100)->unique();
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->string('module', 100)->nullable();
            $table->boolean('is_system')->default(false);
            $audit($table);
        });

        Schema::create('roles', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('name', 100)->unique();
            $table->text('description')->nullable();
            $table->integer('level')->default(0);
            $audit($table);
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->uuid('role_id');
            $table->uuid('permission_id');
            $table->primary(['role_id', 'permission_id']);
        });

        Schema::create('users', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('email', 200)->unique();
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('phone_number', 50)->nullable();
            $table->string('profile_picture_url', 500)->nullable();
            $table->string('time_zone', 100)->default('UTC');
            $table->string('password_hash', 500)->nullable();
            $table->string('password_reset_token_hash', 128)->nullable();
            $table->timestamp('password_reset_token_expires_at')->nullable();
            $table->uuid('organization_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->string('job_title', 200)->nullable();
            $table->string('employee_code', 50)->unique();
            $table->string('availability_status', 30)->default('Available');
            $table->decimal('availability_percentage', 5, 2)->default(100);
            $table->decimal('ai_performance_score', 5, 2)->default(0);
            $table->decimal('ai_workload_score', 5, 2)->default(0);
            $table->decimal('ai_burnout_risk_score', 5, 4)->default(0);
            $table->timestamp('last_ai_score_update')->nullable();
            $audit($table);
            $table->index('department_id');
            $table->index('organization_id');
        });

        Schema::create('user_roles', function (Blueprint $table) {
            $table->uuid('user_id');
            $table->uuid('role_id');
            $table->primary(['user_id', 'role_id']);
        });

        Schema::create('user_departments', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('department_id');
            $table->boolean('is_primary')->default(false);
            $audit($table);
            $table->unique(['user_id', 'department_id']);
        });

        Schema::create('user_profiles', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->unique();
            $table->string('job_title', 200)->nullable();
            $table->text('bio')->nullable();
            $table->string('linkedin_url', 500)->nullable();
            $table->json('preferences')->nullable();
            $audit($table);
        });

        Schema::create('skills', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->nullable();
            $table->string('name', 200);
            $table->string('category', 100)->nullable();
            $table->text('description')->nullable();
            $audit($table);
            $table->unique('name');
        });

        Schema::create('user_skills', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('skill_id');
            $table->integer('proficiency_level')->default(1);
            $table->integer('experience_months')->default(0);
            $table->timestamp('last_used')->nullable();
            $audit($table);
            $table->unique(['user_id', 'skill_id']);
        });

        Schema::create('projects', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('project_code', 50)->unique();
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->string('category', 100);
            $table->string('status', 20)->default('Planning');
            $table->string('priority', 20)->default('Medium');
            $table->date('planned_start_date');
            $table->date('planned_end_date');
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->decimal('planned_budget', 18, 2)->default(0);
            $table->decimal('actual_cost', 18, 2)->default(0);
            $table->decimal('progress_percentage', 5, 2)->default(0);
            $table->decimal('ai_health_score', 5, 2)->default(0);
            $table->decimal('ai_delay_risk_score', 5, 4)->default(0);
            $table->decimal('ai_budget_risk_score', 5, 4)->default(0);
            $table->text('ai_insights_summary')->nullable();
            $table->uuid('department_id');
            $table->uuid('project_manager_id');
            $audit($table);
            $table->index('department_id');
            $table->index('status');
        });

        Schema::create('milestones', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->date('due_date');
            $table->date('completed_date')->nullable();
            $table->string('status', 20)->default('Pending');
            $table->integer('sort_order')->default(0);
            $audit($table);
            $table->index('project_id');
        });

        Schema::create('tasks', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->uuid('milestone_id')->nullable();
            $table->uuid('parent_task_id')->nullable();
            $table->uuid('assigned_to_user_id')->nullable();
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('Pending');
            $table->string('priority', 20)->default('Medium');
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->decimal('estimated_hours', 8, 2)->default(0);
            $table->decimal('actual_hours', 8, 2)->default(0);
            $table->decimal('progress_percentage', 5, 2)->default(0);
            $table->boolean('is_escalated')->default(false);
            $table->timestamp('escalated_at')->nullable();
            $table->decimal('ai_delay_probability', 5, 4)->default(0);
            $table->decimal('ai_optimal_assignee_score', 5, 4)->default(0);
            $table->text('ai_risk_factors')->nullable();
            $audit($table);
            $table->index('project_id');
            $table->index('status');
            $table->index('due_date');
        });

        Schema::create('task_assignments', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('task_id');
            $table->uuid('user_id');
            $table->boolean('is_primary')->default(true);
            $table->timestamp('assigned_at')->nullable();
            $audit($table);
            $table->unique(['task_id', 'user_id']);
        });

        Schema::create('task_dependencies', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('predecessor_task_id');
            $table->uuid('successor_task_id');
            $table->string('dependency_type', 30)->default('FinishToStart');
            $table->integer('lag_days')->default(0);
            $audit($table);
        });

        Schema::create('task_comments', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('task_id');
            $table->uuid('user_id');
            $table->text('comment');
            $audit($table);
        });

        Schema::create('task_attachments', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('task_id');
            $table->uuid('uploaded_by_user_id');
            $table->string('file_name', 500);
            $table->string('storage_path', 1000);
            $table->string('content_type', 100)->nullable();
            $table->bigInteger('file_size')->default(0);
            $audit($table);
        });

        Schema::create('time_entries', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('task_id');
            $table->uuid('user_id');
            $table->timestamp('start_time');
            $table->timestamp('end_time')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_billable')->default(false);
            $table->decimal('duration_minutes', 10, 2)->nullable();
            $audit($table);
        });

        Schema::create('project_documents', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->uuid('uploaded_by_user_id');
            $table->string('file_name', 500);
            $table->string('storage_path', 1000);
            $table->string('content_type', 100)->nullable();
            $table->bigInteger('file_size')->default(0);
            $audit($table);
        });

        Schema::create('notifications', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('title', 300);
            $table->text('message');
            $table->string('type', 50)->default('Info');
            $table->boolean('is_read')->default(false);
            $table->string('action_url', 500)->nullable();
            $table->timestamp('read_at')->nullable();
            $audit($table);
            $table->index(['user_id', 'is_read']);
        });

        Schema::create('notification_templates', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('code', 100)->unique();
            $table->string('name', 200);
            $table->string('subject', 300)->nullable();
            $table->text('body_template');
            $table->string('channel', 50)->default('Email');
            $audit($table);
        });

        Schema::create('alert_rules', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('name', 200);
            $table->string('event_type', 100);
            $table->text('condition_json')->nullable();
            $table->boolean('is_enabled')->default(true);
            $audit($table);
        });

        Schema::create('dashboards', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('name', 200);
            $table->string('layout_type', 50)->default('Grid');
            $table->boolean('is_default')->default(false);
            $audit($table);
        });

        Schema::create('dashboard_widgets', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('dashboard_id');
            $table->string('widget_type', 100);
            $table->string('title', 200)->nullable();
            $table->json('config_json')->nullable();
            $table->integer('sort_order')->default(0);
            $audit($table);
        });

        Schema::create('reports', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('name', 200);
            $table->string('report_type', 100);
            $table->string('format', 20)->default('pdf');
            $table->binary('data')->nullable();
            $table->uuid('generated_by_user_id')->nullable();
            $table->uuid('project_id')->nullable();
            $table->uuid('department_id')->nullable();
            $audit($table);
        });

        Schema::create('report_schedules', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('report_id')->nullable();
            $table->string('name', 200);
            $table->string('cron_expression', 100);
            $table->string('recipients', 1000)->nullable();
            $table->boolean('is_enabled')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $audit($table);
        });

        Schema::create('integrations', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('name', 200);
            $table->string('provider', 100);
            $table->string('status', 50)->default('Inactive');
            $table->json('config_json')->nullable();
            $table->timestamp('last_sync_at')->nullable();
            $audit($table, false);
            $table->boolean('is_active')->default(true);
        });

        Schema::create('webhooks', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('integration_id');
            $table->string('name', 200);
            $table->string('url', 1000);
            $table->string('secret', 200)->nullable();
            $table->json('events')->nullable();
            $audit($table, false);
            $table->boolean('is_active')->default(true);
        });

        Schema::create('webhook_deliveries', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('webhook_id');
            $table->string('event_type', 100);
            $table->integer('status_code')->nullable();
            $table->text('response_body')->nullable();
            $table->boolean('success')->default(false);
            $table->timestamp('delivered_at')->nullable();
            $audit($table);
        });

        Schema::create('knowledge_articles', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('project_id')->nullable();
            $table->uuid('author_user_id');
            $table->string('title', 300);
            $table->text('content');
            $table->string('category', 100)->nullable();
            $table->integer('view_count')->default(0);
            $audit($table);
        });

        Schema::create('lessons_learned', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->uuid('author_user_id');
            $table->string('title', 300);
            $table->text('description');
            $table->string('impact', 50)->nullable();
            $audit($table);
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('project_id')->nullable();
            $table->string('activity_type', 100);
            $table->text('description');
            $table->json('metadata')->nullable();
            $table->timestamp('created_date')->useCurrent();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('entity_type', 100);
            $table->uuid('entity_id')->nullable();
            $table->string('action', 100);
            $table->uuid('user_id')->nullable();
            $table->json('changes')->nullable();
            $table->timestamp('created_date')->useCurrent();
        });

        Schema::create('ai_models', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('name', 200);
            $table->string('model_type', 100);
            $table->string('version', 50)->nullable();
            $table->json('metrics')->nullable();
            $audit($table, false);
            $table->boolean('is_active')->default(true);
        });

        Schema::create('ai_provider_credentials', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('provider', 100);
            $table->text('api_key')->nullable();
            $table->string('default_model', 200)->nullable();
            $table->json('settings_json')->nullable();
            $audit($table, false);
            $table->boolean('is_enabled')->default(false);
        });

        Schema::create('task_allocation_models', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('name', 200);
            $table->string('storage_path', 500)->nullable();
            $table->decimal('accuracy', 5, 4)->nullable();
            $audit($table);
        });

        Schema::create('delay_prediction_models', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('name', 200);
            $table->string('storage_path', 500)->nullable();
            $table->decimal('accuracy', 5, 4)->nullable();
            $audit($table);
        });

        Schema::create('prediction_results', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('task_id');
            $table->uuid('model_id')->nullable();
            $table->decimal('probability', 5, 4);
            $table->json('factors')->nullable();
            $audit($table);
        });

        Schema::create('training_data_points', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->string('feature_set', 100);
            $table->json('payload');
            $table->string('label', 100)->nullable();
            $audit($table);
        });

        Schema::create('allocation_recommendations', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('task_id');
            $table->uuid('recommended_user_id');
            $table->decimal('score', 5, 4);
            $table->string('status', 30)->default('Pending');
            $table->text('explanation')->nullable();
            $audit($table);
        });

        Schema::create('delay_predictions', function (Blueprint $table) use ($audit) {
            $table->uuid('id')->primary();
            $table->uuid('task_id');
            $table->decimal('probability', 5, 4);
            $table->integer('predicted_delay_days')->default(0);
            $table->json('risk_factors')->nullable();
            $audit($table);
        });
    }

    public function down(): void
    {
        $tables = [
            'delay_predictions', 'allocation_recommendations', 'training_data_points', 'prediction_results',
            'delay_prediction_models', 'task_allocation_models', 'ai_provider_credentials', 'ai_models',
            'audit_logs', 'activity_logs', 'lessons_learned', 'knowledge_articles', 'webhook_deliveries',
            'webhooks', 'integrations', 'report_schedules', 'reports', 'dashboard_widgets', 'dashboards',
            'alert_rules', 'notification_templates', 'notifications', 'project_documents', 'time_entries',
            'task_attachments', 'task_comments', 'task_dependencies', 'task_assignments', 'tasks',
            'milestones', 'projects', 'user_skills', 'skills', 'user_profiles', 'user_departments',
            'user_roles', 'users', 'role_permissions', 'roles', 'permissions', 'departments', 'organizations',
        ];
        foreach ($tables as $table) {
            Schema::dropIfExists($table);
        }
    }
};
