import type { Flow, FlowApi, Step } from "./types.js";
import type { Plan } from "./data.js";
import type { RunContext } from "../lib/context.js";

/**
 * Flow 3 - department heads create tasks and subtasks on their milestones.
 */

const HEADS = ["head-civil", "head-pmo"];

function plan(ctx: RunContext): Plan {
  if (!ctx.notes.plan) throw new Error("Flow 1 must run first: no project plan on the context.");
  return JSON.parse(ctx.notes.plan) as Plan;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function taskTitle(ctx: RunContext, head: string, i: number): string {
  return `Task ${head}-${i + 1} ${plan(ctx).projectName.split(" ").pop()}`;
}

function subtaskTitle(head: string, i: number, j: number): string {
  return `Subtask ${head}-${i + 1}.${j + 1}`;
}

function makeTaskStep(head: string): Step {
  return {
    id: `tasks-${head}`,
    title: `${head} creates two tasks on their milestone`,
    as: head,
    async run(api) {
      const d = await api.as(head);
      const project = api.ctx.latestProject();
      const milestone = milestoneFor(api.ctx, project.id, head);

      await d.goto(`/projects/${project.id}/tasks`);

      for (let i = 0; i < 2; i++) {
        const title = taskTitle(api.ctx, head, i);
        await d.click("newTask", "shell-actions");
        await d.fill("title", title, "task-form", { nth: "0,1,2" });
        await d.fill("description", `Task created by ${head} during e2e run.`, "task-form", { nth: "0,1,2" });
        await d.fill("start", today(), "task-form", { nth: "0,1,2" });
        await d.fill("due", inDays(14 + i * 7), "task-form", { nth: "0,1,2" });
        await d.fill("estimatedHours", "16", "task-form", { nth: "0,1,2" });
        await d.select("priority", i === 0 ? "High" : "Medium", "task-form", { nth: "0,1,2,3" });

        // Assign the milestone when the select is available to this role.
        if (milestone) {
          await d
            .select("milestone", milestone.name, "task-form", { nth: "0,1,2,3,4" })
            .catch(() => api.report.warn(`milestone "${milestone.name}" not selectable here`));
        }

        await d.click("save", "task-form", { nth: "0,1" });
        await d.page.waitForTimeout(1500);

        const list = (api.ctx.tasks[project.id] ??= []);
        list.push({ id: "", title, milestone: milestone?.name ?? "" });
        api.report.ok(`${head} created task "${title}"`);
      }
    },
  };
}

function makeSubtaskStep(head: string): Step {
  return {
    id: `subtasks-${head}`,
    title: `${head} adds subtasks to their task`,
    as: head,
    async run(api) {
      const d = await api.as(head);
      const project = api.ctx.latestProject();
      const tasks = api.ctx.tasks[project.id] ?? [];
      const task = tasks.find((t) => t.title.startsWith(`Task ${head}-1`)) ?? tasks[0];
      if (!task) {
        api.report.warn("no task to add subtasks to, skipping");
        return;
      }

      // Expand the subtasks panel on the task card, then add two subtasks.
      await d.goto(`/projects/${project.id}/tasks`);
      const card = d.page.locator("div[role='button']").filter({ hasText: task.title }).first();
      if ((await card.count()) === 0) {
        api.report.warn(`task card not found for "${task.title}"`);
        return;
      }
      await card.hover();

      for (let j = 0; j < 2; j++) {
        const title = subtaskTitle(head, 0, j);
        const addBtn = d.page.getByTitle("Add subtask").first();
        if ((await addBtn.count()) === 0) {
          api.report.warn("no Add subtask button visible");
          break;
        }
        await addBtn.click({ force: true });
        await d.page.waitForTimeout(500);
        await d.fill("inlineSubtaskTitle", title, "task-card");
        await d.click("inlineSubtaskAdd", "task-card");
        await d.page.waitForTimeout(1000);

        const list = (api.ctx.subtasks[project.id] ??= []);
        list.push({ id: "", title, task: task.title });
        api.report.ok(`${head} created subtask "${title}"`);
      }
    },
  };
}

/** The milestone this head created in flow 2, if it exists. */
function milestoneFor(ctx: RunContext, projectId: string, head: string) {
  const list = ctx.milestones[projectId] ?? [];
  return list.find((m) => m.departmentId === head) ?? list[list.length - 1];
}

export const tasksAndSubtasksFlow: Flow = {
  id: "tasks-subtasks",
  title: "3. Department heads create tasks and subtasks",
  description:
    "Each head signs in again and creates two tasks on their own milestone, then adds " +
    "subtasks to the first task.",
  users: HEADS,
  steps: [...HEADS.map(makeTaskStep), ...HEADS.map(makeSubtaskStep)],
};