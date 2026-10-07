import type { Flow, FlowApi, Step } from "./types.js";

/**
 * Flow 6 - a department head edits and then deletes one milestone and one
 * task on their own project, confirming the delete confirmation modal.
 */

const HEAD = "head-civil";

const editMilestone: Step = {
  id: "edit-milestone",
  title: `${HEAD} edits one milestone (name + due date)`,
  as: HEAD,
  async run(api) {
    const d = await api.as(HEAD);
    const project = api.ctx.latestProject();
    const milestones = api.ctx.milestones[project.id] ?? [];
    // Pick the milestone this head owns, else the last one.
    const target = milestones.find((m) => m.departmentId === HEAD) ?? milestones[milestones.length - 1];
    if (!target) {
      api.report.warn("no milestone to edit");
      return;
    }

    await d.goto(`/projects/${project.id}/milestones`);
    const card = d.page.locator("div[role='button']").filter({ hasText: target.name }).first();
    if ((await card.count()) === 0) {
      api.report.warn(`milestone "${target.name}" not visible to ${HEAD}`);
      return;
    }
    await card.hover();
    await d.click("editMilestone", "milestone-card", { nth: "0" });
    await d.page.waitForTimeout(600);

    const newName = `${target.name} (edited)`;
    await d.fill("name", newName, "milestone-form", { nth: "0,1" });
    const due = new Date();
    due.setDate(due.getDate() + 50);
    await d.fill("dueDate", due.toISOString().slice(0, 10), "milestone-form", { nth: "0,1" });
    await d.click("save", "milestone-form", { nth: "0,1" });
    await d.page.waitForTimeout(1500);

    target.name = newName;
    if (d.apiFailures().length) {
      api.report.warn(`edit milestone API failures: ${d.apiFailures().map((f) => f.status).join(", ")}`);
    } else {
      api.report.ok(`milestone edited -> "${newName}"`);
    }
  },
};

const deleteMilestone: Step = {
  id: "delete-milestone",
  title: `${HEAD} deletes a milestone via the confirmation modal`,
  as: HEAD,
  async run(api) {
    const d = await api.as(HEAD);
    const project = api.ctx.latestProject();
    const milestones = api.ctx.milestones[project.id] ?? [];
    const target = milestones[milestones.length - 1];
    if (!target) {
      api.report.warn("no milestone to delete");
      return;
    }

    await d.goto(`/projects/${project.id}/milestones`);
    const card = d.page.locator("div[role='button']").filter({ hasText: target.name }).first();
    if ((await card.count()) === 0) {
      api.report.warn(`milestone "${target.name}" not visible for delete`);
      return;
    }

    // Open the detail modal (which owns the Delete button), then delete.
    await card.hover();
    await d.click("viewMilestone", "milestone-card", { nth: "0" });
    await d.page.waitForTimeout(600);
    await d.click("deleteMilestone", "milestone-detail", { nth: "0,1" });
    await d.page.waitForTimeout(600);

    // ConfirmDeleteModal uses a distinct "Delete Permanently" button; fall back
    // to the milestone confirm header.
    await d.click("confirm", "milestone-detail", { nth: "0,1" }).catch(async (err: unknown) => {
      api.report.warn(`confirm button not found: ${String(err).split("\n")[0]}`);
    });
    await d.page.waitForTimeout(2000);

    if (d.apiFailures().length) {
      api.report.warn(`delete milestone API failures: ${d.apiFailures().map((f) => f.status).join(", ")}`);
    } else {
      const list = api.ctx.milestones[project.id] ?? [];
      api.ctx.milestones[project.id] = list.filter((m) => m.name !== target.name);
      api.report.ok(`milestone deleted: "${target.name}"`);
    }
  },
};

const deleteTask: Step = {
  id: "delete-task",
  title: `${HEAD} deletes one task they created`,
  as: HEAD,
  async run(api) {
    const d = await api.as(HEAD);
    const project = api.ctx.latestProject();
    const tasks = api.ctx.tasks[project.id] ?? [];
    const target = tasks[tasks.length - 1];
    if (!target) {
      api.report.warn("no task to delete");
      return;
    }

    await d.goto(`/projects/${project.id}/tasks`);
    const card = d.page.locator("div[role='button']").filter({ hasText: target.title }).first();
    if ((await card.count()) === 0) {
      api.report.warn(`task "${target.title}" not visible for delete`);
      return;
    }
    await card.hover();
    await d.click("deleteTask", "task-card", { nth: "0", hover: "1" }).catch(async (err: unknown) => {
      api.report.warn(`delete task button: ${String(err).split("\n")[0]}`);
    });
    // Task delete uses a native confirm(); accept it.
    d.page.once("dialog", (dialog) => dialog.accept());
    await d.page.waitForTimeout(2000);

    if (d.apiFailures().length) {
      api.report.warn(`delete task API failures: ${d.apiFailures().map((f) => f.status).join(", ")}`);
    } else {
      api.ctx.tasks[project.id] = tasks.filter((t) => t.title !== target.title);
      api.report.ok(`task deleted: "${target.title}"`);
    }
  },
};

export const editDeleteFlow: Flow = {
  id: "edit-delete",
  title: "6. Department head edits and deletes a milestone and a task",
  description:
    "The head edits a milestone's name and due date, then deletes one milestone through " +
    "the confirmation modal and one of their tasks.",
  users: [HEAD],
  steps: [editMilestone, deleteMilestone, deleteTask],
};