import type { Project, ProjectHealth, Task, User } from "../../types";

/**
 * Plain-language, deterministic fallbacks for the AI cards.
 *
 * Every function here works purely from data the app already has (projects,
 * tasks, users). They exist so the AI page still shows a real, explainable
 * number when the AI provider is unreachable or slow, instead of the invented
 * constants the cards used to render. Anything computed here is labelled
 * "Calculated" in the UI, and every card's ? popup describes this method.
 */

const DAY = 86_400_000;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pct = (n: number) => Math.round(clamp01(n) * 100);

function daysBetween(from: string | Date | null | undefined, to: string | Date = new Date()): number {
  if (!from) return 0;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return (end - start) / DAY;
}

export function isTaskDone(task: Task): boolean {
  return task.status === "Completed" || (task.progressPercentage ?? 0) >= 100;
}

export function isTaskLate(task: Task): boolean {
  return !isTaskDone(task) && task.dueDate ? new Date(task.dueDate).getTime() < Date.now() : false;
}

export type HealthBreakdown = {
  overall: number;
  schedule: number;
  budget: number;
  team: number;
  /** Inputs actually used, so the UI can state what the number came from. */
  sampleSize: number;
  hasData: boolean;
};

/**
 * Health score from real project facts, weighted the same way a reviewer
 * would reason about it:
 *   schedule  - how much of the planned time has gone vs how much is done
 *   budget    - how much of the planned budget has been spent
 *   team      - how much of the work is late or blocked
 */
export function computeHealth(project: Project | null, tasks: Task[]): HealthBreakdown {
  if (!project) {
    return { overall: 0, schedule: 0, budget: 0, team: 0, sampleSize: 0, hasData: false };
  }

  const total = project.totalTasks ?? tasks.length;
  const done = project.completedTasks ?? tasks.filter(isTaskDone).length;
  const progress = total > 0 ? clamp01(done / total) : clamp01((project.progressPercentage ?? 0) / 100);

  // Schedule: expected progress by this point in the project's planned window.
  const plannedDays = Math.max(1, daysBetween(project.plannedStartDate, project.plannedEndDate));
  const elapsedDays = Math.max(0, daysBetween(project.plannedStartDate));
  const expected = project.status === "Completed" ? 1 : clamp01(elapsedDays / plannedDays);
  // Behind schedule penalises; ahead of schedule is not rewarded above 1.
  const schedule = project.status === "Completed"
    ? 1
    : clamp01(1 - Math.max(0, expected - progress) * 1.6);

  // Budget: 1.0 means spend matches the share of work actually delivered.
  const plannedBudget = project.plannedBudget ?? 0;
  const actualCost = project.actualCost ?? 0;
  const budget = plannedBudget > 0
    ? clamp01((actualCost / plannedBudget) / Math.max(progress, 0.05))
    : 1;

  // Team: share of the project's work that is late.
  const lateTasks = tasks.filter(isTaskLate).length;
  const team = total > 0 ? clamp01(1 - lateTasks / total) : 1;

  const overall = clamp01(schedule * 0.4 + budget * 0.3 + team * 0.3);

  return {
    overall: pct(overall) / 100,
    schedule: pct(schedule) / 100,
    budget: pct(budget) / 100,
    team: pct(team) / 100,
    sampleSize: tasks.length,
    hasData: true,
  };
}

export type RiskBand = "Low" | "Medium" | "High" | "Critical";

export function riskBand(value: number): RiskBand {
  if (value >= 0.8) return "Critical";
  if (value >= 0.6) return "High";
  if (value >= 0.4) return "Medium";
  return "Low";
}

export type RiskItem = {
  label: string;
  /** 0-1, higher is worse. */
  value: number;
  level: RiskBand;
  /** One clause on where the number comes from. */
  basis: string;
  tone: "red" | "amber" | "indigo";
};

/**
 * The three risk bars. Uses the server's AI scores when present and falls back
 * to the derived health breakdown otherwise, so the bars always move with the
 * project's real schedule, budget, and workload.
 */
export function computeRisks(
  project: Project | null,
  health: ProjectHealth | null,
  tasks: Task[]
): RiskItem[] {
  const derived = computeHealth(project, tasks);
  const hasHealth = !!health;

  const budgetRisk = hasHealth
    ? 1 - (health.budgetHealth ?? 1)
    : 1 - derived.budget;
  const scheduleRisk = hasHealth
    ? 1 - (health.scheduleHealth ?? 1)
    : 1 - derived.schedule;

  // Resource conflict: how much of the work is late, blended with the
  // project's stored team score when the health service supplied one.
  const total = project?.totalTasks ?? tasks.length;
  const lateShare = total > 0 ? tasks.filter(isTaskLate).length / total : 0;
  const teamRisk = hasHealth ? 1 - (health.teamHealth ?? 1) : 0;
  const resourceRisk = Math.max(lateShare * 0.7, teamRisk * 0.5, project?.aiDelayRiskScore ?? 0);

  const lateCount = tasks.filter(isTaskLate).length;

  return [
    {
      label: "Budget Overrun",
      value: clamp01(budgetRisk),
      level: riskBand(budgetRisk),
      basis: project && project.plannedBudget > 0
        ? `${Math.round(((project.actualCost ?? 0) / project.plannedBudget) * 100)}% of budget spent`
        : "No budget set for this project",
      tone: "red",
    },
    {
      label: "Schedule Delay",
      value: clamp01(scheduleRisk),
      level: riskBand(scheduleRisk),
      basis: project
        ? `${Math.round(project.progressPercentage ?? 0)}% done against its planned dates`
        : "Select a project to see schedule risk",
      tone: "amber",
    },
    {
      label: "Resource Conflict",
      value: clamp01(resourceRisk),
      level: riskBand(resourceRisk),
      basis: total > 0
        ? `${lateCount} of ${total} tasks past due`
        : "No tasks to measure yet",
      tone: "indigo",
    },
  ];
}

export type HeatCell = {
  name: string;
  /** 0-100 load intensity. */
  value: number;
  atRisk: boolean;
  taskCount: number;
  lateCount: number;
};

/**
 * Workload intensity per milestone, from the project's real task list.
 * Load is the share of that milestone's tasks still open, blended with how
 * many of them are late, so a milestone that is nearly finished shows low
 * load and a stalled one shows high load.
 */
export function computeHeatmap(tasks: Task[]): HeatCell[] {
  const groups = new Map<string, Task[]>();

  for (const task of tasks) {
    const key = task.milestoneName?.trim() || "Unassigned";
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  }

  const cells: HeatCell[] = [];

  for (const [name, list] of groups) {
    const open = list.filter((t) => !isTaskDone(t));
    const late = list.filter(isTaskLate);
    const taskCount = list.length;

    // Open share carries most of the signal; late share adds the pressure.
    const openShare = taskCount > 0 ? open.length / taskCount : 0;
    const lateShare = taskCount > 0 ? late.length / taskCount : 0;
    const value = pct(clamp01(openShare * 0.65 + lateShare * 0.35));

    cells.push({
      name,
      value,
      atRisk: value >= 60 || lateShare >= 0.4,
      taskCount,
      lateCount: late.length,
    });
  }

  return cells.sort((a, b) => b.value - a.value).slice(0, 8);
}

export type TimelineRow = {
  id: string;
  name: string;
  /** 0-100 progress bar. */
  progress: number;
  status: "On Track" | "At Risk" | "Ahead";
  detail: string;
  tone: "indigo" | "red" | "emerald";
};

/**
 * Where each project actually is against its own dates.
 *
 * Completion is estimated by assuming work finishes linearly between the
 * current start date and the planned end date, using real progress. That is
 * deliberately simple: the goal is a defensible date, not a clever forecast.
 */
export function computeTimeline(projects: Project[]): TimelineRow[] {
  return projects
    .filter((p) => p.status !== "Completed")
    .slice(0, 6)
    .map((p) => {
      const progress = clamp01((p.progressPercentage ?? 0) / 100);
      const plannedDays = daysBetween(p.plannedStartDate, p.plannedEndDate);
      const elapsedDays = Math.max(0, daysBetween(p.plannedStartDate));

      // Straight-line projection: if the current pace holds, how much more
      // time does the remaining work need?
      const projectedDays = progress > 0.01 ? elapsedDays / progress : Number.POSITIVE_INFINITY;
      const driftDays = Number.isFinite(projectedDays) ? projectedDays - plannedDays : plannedDays;

      const start = new Date(p.plannedStartDate);
      const projectedEnd = new Date(
        (Number.isFinite(projectedDays) ? projectedDays : plannedDays * 2) * DAY + start.getTime()
      );

      const status: TimelineRow["status"] =
        driftDays > 7 ? "At Risk" : driftDays < -3 ? "Ahead" : "On Track";

      const detail = Number.isFinite(projectedDays)
        ? driftDays > 0
          ? `Projected ${projectedEnd.toLocaleDateString()} · about ${Math.round(driftDays)} day${Math.round(driftDays) === 1 ? "" : "s"} late`
          : `Projected ${projectedEnd.toLocaleDateString()} · about ${Math.abs(Math.round(driftDays))} days early`
        : "No progress recorded yet · cannot project a date";

      return {
        id: p.id,
        name: p.name,
        progress: pct(progress),
        status,
        detail,
        tone: status === "At Risk" ? "red" : status === "Ahead" ? "emerald" : "indigo",
      };
    });
}

export type Insight = { title: string; detail: string; tone: "red" | "amber" | "indigo" | "emerald" };

/**
 * Actionable findings derived from the selected project's real state. These
 * replace the three hardcoded recommendations the card used to render.
 */
export function computeInsights(
  project: Project | null,
  health: ProjectHealth | null,
  tasks: Task[],
  burnout: Array<{ fullName: string; burnoutRisk: number; activeTasks: number }>
): Insight[] {
  const insights: Insight[] = [];

  if (project) {
    if (project.plannedBudget > 0 && project.actualCost > project.plannedBudget) {
      const over = Math.round(((project.actualCost - project.plannedBudget) / project.plannedBudget) * 100);
      insights.push({
        title: "Reduce spend or re-forecast",
        detail: `${project.name} is ${over}% over its planned budget. Review the cost lines driving the overrun.`,
        tone: "red",
      });
    }

    const late = tasks.filter(isTaskLate);
    if (late.length > 0) {
      insights.push({
        title: `Clear ${late.length} overdue task${late.length === 1 ? "" : "s"}`,
        detail: `The furthest behind is "${late[0].title}", due ${new Date(late[0].dueDate).toLocaleDateString()}. Escalate or re-date it.`,
        tone: "red",
      });
    }

    const unassigned = tasks.filter((t) => !isTaskDone(t) && !t.assignedToUserId && !t.assignees?.length);
    if (unassigned.length > 0) {
      insights.push({
        title: `Assign ${unassigned.length} open task${unassigned.length === 1 ? "" : "s"}`,
        detail: "Open work with nobody responsible is the most common cause of a missed date.",
        tone: "amber",
      });
    }

    const stalled = tasks.filter(
      (t) => !isTaskDone(t) && t.status === "NotStarted" && t.startDate && new Date(t.startDate).getTime() < Date.now()
    );
    if (stalled.length > 0) {
      insights.push({
        title: `${stalled.length} task${stalled.length === 1 ? " has" : "s have"} a start date in the past but no progress`,
        detail: `Oldest is "${stalled[0].title}". Either start it or move its dates to match reality.`,
        tone: "amber",
      });
    }
  }

  const strained = burnout.filter((b) => (b.burnoutRisk ?? 0) >= 0.6);
  if (strained.length > 0) {
    insights.push({
      title: "Rebalance the team load",
      detail: `${strained.map((b) => b.fullName).slice(0, 3).join(", ")} ${strained.length === 1 ? "is" : "are"} carrying more than a fair share of open work.`,
      tone: "red",
    });
  }

  if (health) {
    for (const weakness of health.weaknesses.slice(0, 2)) {
      insights.push({ title: weakness, detail: "Flagged as a weakness in the latest health analysis.", tone: "indigo" });
    }
  }

  if (insights.length === 0) {
    insights.push({
      title: project ? "Nothing needs attention right now" : "Select a project to analyse",
      detail: project
        ? "No overdue work, no budget overrun, and no overloaded team members were found for this project."
        : "Pick a project from the list to see its own findings.",
      tone: "emerald",
    });
  }

  return insights.slice(0, 6);
}

export type Anomaly = { title: string; detail: string; time: string; tone: "red" | "amber" | "indigo" };

/**
 * Live anomalies from the current portfolio: escalated tasks, overdue tasks,
 * and projects past their end date. Replaces the three hardcoded entries.
 */
export function computeAnomalies(
  projects: Project[],
  overdue: Task[],
  escalated: Task[]
): Anomaly[] {
  const out: Anomaly[] = [];

  for (const task of escalated.slice(0, 3)) {
    out.push({
      title: "Escalated task",
      detail: `"${task.title}" was escalated in ${task.projectName || "a project"}.`,
      time: task.escalatedDate ? new Date(task.escalatedDate).toLocaleDateString() : "Recently",
      tone: "red",
    });
  }

  for (const task of overdue.slice(0, 3)) {
    out.push({
      title: "Overdue task",
      detail: `"${task.title}" passed its due date in ${task.projectName || "a project"}.`,
      time: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Recently",
      tone: "amber",
    });
  }

  for (const project of projects.filter((p) => p.status !== "Completed" && p.plannedEndDate && new Date(p.plannedEndDate).getTime() < Date.now()).slice(0, 2)) {
    out.push({
      title: "Project past its end date",
      detail: `"${project.name}" was due ${new Date(project.plannedEndDate).toLocaleDateString()} and is still open.`,
      time: new Date(project.plannedEndDate).toLocaleDateString(),
      tone: "red",
    });
  }

  if (out.length === 0) {
    out.push({ title: "No anomalies", detail: "Nothing escalated, overdue, or past its end date.", time: "Now", tone: "indigo" });
  }

  return out;
}

/**
 * Per-user workload from the real task list, used when the burnout endpoint is
 * unavailable. Mirrors the server's intent (open tasks vs a fair share) so the
 * two paths do not disagree.
 */
export function computeFallbackBurnout(
  tasks: Task[],
  users: User[]
): Array<{ userId: string; fullName: string; burnoutRisk: number; workloadScore: number; activeTasks: number; riskLevel: RiskBand }> {
  const open = tasks.filter((t) => !isTaskDone(t));
  const fairShare = users.length > 0 ? open.length / users.length : 0;

  const rows = users.map((user) => {
    const mine = open.filter((t) => t.assignedToUserId === user.id || t.assignees?.some((a) => a.userId === user.id));
    const late = mine.filter(isTaskLate).length;

    // Load above a fair share drives risk; being behind on work adds to it.
    const loadRatio = fairShare > 0 ? mine.length / fairShare : 0;
    const risk = clamp01(Math.max(0, (loadRatio - 1)) * 0.6 + (mine.length > 0 ? (late / mine.length) * 0.4 : 0));

    return {
      userId: user.id,
      fullName: user.fullName ?? user.email,
      burnoutRisk: risk,
      workloadScore: clamp01(loadRatio / 3),
      activeTasks: mine.length,
      riskLevel: riskBand(risk),
    };
  });

  return rows.sort((a, b) => b.burnoutRisk - a.burnoutRisk).filter((r) => r.activeTasks > 0 || r.burnoutRisk > 0);
}
