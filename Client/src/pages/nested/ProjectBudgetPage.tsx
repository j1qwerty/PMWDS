import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { BudgetRelease, BudgetSummary, Goal } from "../../types";
import {
  GlassCard,
  LoadingPage,
  useNavHeader,
  usePermission,
  useToast,
} from "../shared";
import { Dialog } from "../shared/Dialog";
import { useProjectWorkspace } from "./nestedShared";
import { ProjectNotFound } from "./ProjectNotFound";
import { Icon } from "../../components/ui/Icon";

const money = (value: number) =>
  value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function ProjectBudgetPage() {
  const ws = useProjectWorkspace();
  const { auth } = useAuth();
  const perm = usePermission();
  const { addToast } = useToast();
  const { setNavHeader } = useNavHeader();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"allocation" | "release" | "expenditure" | "amend" | null>(null);
  const [reviewing, setReviewing] = useState<BudgetRelease | null>(null);

  const load = async () => {
    if (!auth || !ws.project) return;
    setLoading(true);
    try {
      const loadedGoals = await api.getGoalsByProject(auth.token, ws.project.id);
      setGoals(loadedGoals);
      const nextGoalId = selectedGoalId && loadedGoals.some((goal) => goal.id === selectedGoalId)
        ? selectedGoalId
        : loadedGoals[0]?.id ?? "";
      setSelectedGoalId(nextGoalId);
      setSummary(nextGoalId ? await api.getBudgetSummary(auth.token, nextGoalId) : null);
    } catch (cause) {
      addToast(cause instanceof Error ? cause.message : "Failed to load budget data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [auth, ws.project?.id]);

  useEffect(() => {
    if (!auth || !selectedGoalId || !goals.some((goal) => goal.id === selectedGoalId)) return;
    void api.getBudgetSummary(auth.token, selectedGoalId)
      .then(setSummary)
      .catch((cause) => addToast(cause instanceof Error ? cause.message : "Failed to load goal budget.", "error"));
  }, [auth, selectedGoalId, goals]);

  useEffect(() => {
    setNavHeader({
      title: ws.project ? `Budget · ${ws.project.name}` : "Budget",
      description: "Goal allocations, release tranches and recorded expenditure.",
    });
  }, [setNavHeader, ws.project]);

  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? null;
  const canCreate = perm.module("budget").create();
  const canApprove = perm.module("budget").approve();

  const refreshSummary = async () => {
    if (!auth || !selectedGoalId) return;
    setSummary(await api.getBudgetSummary(auth.token, selectedGoalId));
    await ws.refresh();
  };

  if (ws.loading || loading) return <LoadingPage label="Loading project budget..." />;
  if (!ws.project) return <ProjectNotFound />;

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Project reserve</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{money(ws.project.plannedBudget)}</p>
          </div>
          <label className="grid gap-1.5 sm:min-w-80">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Goal</span>
            <select value={selectedGoalId} onChange={(event) => setSelectedGoalId(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100">
              <option value="">Select a goal</option>
              {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
            </select>
          </label>
        </div>
      </GlassCard>

      {!selectedGoal ? (
        <GlassCard className="p-10 text-center">
          <Icon name="account_balance_wallet" size={28} className="mx-auto text-indigo-400" />
          <h2 className="mt-3 text-base font-bold text-slate-900">Create a goal first</h2>
          <p className="mt-1 text-sm text-slate-500">Budget allocations are attached to goals, not directly to tasks.</p>
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Allocated" value={money(summary?.allocated ?? 0)} />
            <SummaryCard label="Released" value={money(summary?.released ?? 0)} />
            <SummaryCard label="Spent" value={money(summary?.spent ?? 0)} />
            <SummaryCard label="Unreleased" value={money(summary?.unreleased ?? 0)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Allocation</h2>
                  <p className="mt-1 text-xs text-slate-500">Goal allocation is a separate auditable record. Amendments supersede the previous record.</p>
                </div>
                {canCreate && (
                  <button type="button" onClick={() => setDialog(summary?.allocations.some((item) => item.status === "Active") ? "amend" : "allocation")} className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
                    {summary?.allocations.some((item) => item.status === "Active") ? "Amend" : "Allocate"}
                  </button>
                )}
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {(summary?.allocations ?? []).map((allocation) => (
                  <div key={allocation.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-700">{allocation.status}</p>
                      <p className="truncate text-[11px] text-slate-400">{allocation.reason || "No reason provided."}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-900">{money(allocation.amount)}</span>
                  </div>
                ))}
                {!summary?.allocations.length && <p className="py-6 text-center text-xs text-slate-400">No allocation recorded.</p>}
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Release tranches</h2>
                  <p className="mt-1 text-xs text-slate-500">Conditions can gate approval and partial approval is supported.</p>
                </div>
                {canCreate && summary?.allocations.some((item) => item.status === "Active") && (
                  <button type="button" onClick={() => setDialog("release")} className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Request release</button>
                )}
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {(summary?.releases ?? []).map((release) => (
                  <div key={release.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{money(release.amountRequested)} requested</p>
                      <p className="text-[11px] text-slate-400">{release.status} · approved {money(release.amountApproved)}</p>
                    </div>
                    {canApprove && release.status === "Pending" && (
                      <button type="button" onClick={() => setReviewing(release)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800">Review</button>
                    )}
                  </div>
                ))}
                {!summary?.releases.length && <p className="py-6 text-center text-xs text-slate-400">No release requests recorded.</p>}
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Expenditure</h2>
                <p className="mt-1 text-xs text-slate-500">Only approved released budget can be recorded as expenditure.</p>
              </div>
              {canCreate && summary?.releases.some((item) => item.status === "Approved" && item.amountApproved > 0) && (
                <button type="button" onClick={() => setDialog("expenditure")} className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Record expenditure</button>
              )}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Description</th><th className="py-2 pr-3">Invoice</th><th className="py-2 text-right">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(summary?.expenditures ?? []).map((expense) => (
                    <tr key={expense.id}>
                      <td className="py-3 pr-3 text-slate-500">{new Date(expense.spentOn).toLocaleDateString()}</td>
                      <td className="py-3 pr-3 font-medium text-slate-700">{expense.description}</td>
                      <td className="py-3 pr-3 text-slate-400">{expense.invoiceNumber || "—"}</td>
                      <td className="py-3 text-right font-semibold text-slate-800">{money(expense.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!summary?.expenditures.length && <p className="py-8 text-center text-xs text-slate-400">No expenditure recorded.</p>}
            </div>
          </GlassCard>
        </>
      )}

      {dialog && selectedGoal && (
        <BudgetFormDialog
          mode={dialog}
          summary={summary}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null);
            await refreshSummary();
            addToast(dialog === "expenditure" ? "Expenditure recorded" : dialog === "release" ? "Release requested" : "Budget allocation saved");
          }}
          token={auth!.token}
          goalId={selectedGoal.id}
        />
      )}

      {reviewing && (
        <BudgetReviewDialog
          release={reviewing}
          token={auth!.token}
          onClose={() => setReviewing(null)}
          onSaved={async () => {
            setReviewing(null);
            await refreshSummary();
            addToast("Budget release reviewed");
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </GlassCard>
  );
}

function BudgetFormDialog({
  mode,
  summary,
  token,
  goalId,
  onClose,
  onSaved,
}: {
  mode: "allocation" | "release" | "expenditure" | "amend";
  summary: BudgetSummary | null;
  token: string;
  goalId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const activeAllocation = summary?.allocations.find((item) => item.status === "Active") ?? null;
  const approvedReleases = summary?.releases.filter((item) => item.status === "Approved" && item.amountApproved > 0) ?? [];
  const [amount, setAmount] = useState(mode === "amend" ? String(activeAllocation?.amount ?? "") : "");
  const [description, setDescription] = useState("");
  const [invoice, setInvoice] = useState("");
  const [spentOn, setSpentOn] = useState(new Date().toISOString().slice(0, 10));
  const [releaseId, setReleaseId] = useState(approvedReleases[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [justification, setJustification] = useState("");
  const [conditions, setConditions] = useState<Array<{ key: string; satisfied: boolean }>>([
    { key: "goalProgress", satisfied: false },
    { key: "documentApproval", satisfied: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || saving) return;
    setSaving(true);
    setError("");
    try {
      if (mode === "allocation") {
        await api.createGoalBudgetAllocation(token, { goalId, amount: numericAmount, reason: reason.trim() || null });
      } else if (mode === "amend") {
        if (!activeAllocation) throw new Error("There is no active allocation to amend.");
        await api.amendGoalBudgetAllocation(token, activeAllocation.id, { amount: numericAmount, reason: reason.trim() || null });
      } else if (mode === "release") {
        if (!activeAllocation) throw new Error("Create an active allocation first.");
        const required = Object.fromEntries(conditions.map((condition) => [condition.key.trim(), true]).filter(([key]) => key));
        const satisfied = Object.fromEntries(conditions.map((condition) => [condition.key.trim(), condition.satisfied]).filter(([key]) => key));
        await api.requestBudgetRelease(token, {
          goalBudgetAllocationId: activeAllocation.id,
          amountRequested: numericAmount,
          requiredConditions: required,
          satisfiedConditions: satisfied,
          justification: justification.trim() || null,
        });
      } else {
        if (!releaseId) throw new Error("Select an approved release.");
        await api.createBudgetExpenditure(token, {
          goalBudgetAllocationId: activeAllocation?.id ?? "",
          budgetReleaseId: releaseId,
          amount: numericAmount,
          spentOn,
          description: description.trim(),
          invoiceNumber: invoice.trim() || null,
        });
      }
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to save budget data.");
      setSaving(false);
    }
  };

  const title = mode === "allocation" ? "Allocate goal budget"
    : mode === "amend" ? "Amend goal allocation"
      : mode === "release" ? "Request budget release"
        : "Record expenditure";

  return (
    <Dialog
      title={title}
      description={mode === "release" ? "A release request remains pending until a reviewer approves, withholds or rejects it." : "Amounts are validated by the server against the project and goal budget."}
      icon="account_balance_wallet"
      size="md"
      onClose={onClose}
      closeOnBackdrop={!saving}
      showCloseButton={!saving}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={saving || !Number(amount)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
      }
    >
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <Field label="Amount" value={amount} onChange={setAmount} type="number" />
        {(mode === "allocation" || mode === "amend") && <Field label="Reason" value={reason} onChange={setReason} />}
        {mode === "release" && (
          <>
            <Field label="Justification" value={justification} onChange={setJustification} />
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Release conditions</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">All required conditions must be satisfied before approval.</p>
                </div>
                <button type="button" onClick={() => setConditions([...conditions, { key: "", satisfied: false }])} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Add</button>
              </div>
              <div className="mt-3 space-y-2">
                {conditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input value={condition.key} placeholder="Condition name" onChange={(event) => setConditions(conditions.map((item, i) => i === index ? { ...item, key: event.target.value } : item))} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
                    <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-slate-600">
                      <input type="checkbox" checked={condition.satisfied} onChange={(event) => setConditions(conditions.map((item, i) => i === index ? { ...item, satisfied: event.target.checked } : item))} />
                      Satisfied
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {mode === "expenditure" && (
          <>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved release</span>
              <select value={releaseId} onChange={(event) => setReleaseId(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100">
                {approvedReleases.map((release) => <option key={release.id} value={release.id}>{money(release.amountApproved)} approved</option>)}
              </select>
            </label>
            <Field label="Description" value={description} onChange={setDescription} />
            <Field label="Invoice number" value={invoice} onChange={setInvoice} />
            <Field label="Spent on" value={spentOn} onChange={setSpentOn} type="date" />
          </>
        )}
      </div>
    </Dialog>
  );
}

function BudgetReviewDialog({
  release,
  token,
  onClose,
  onSaved,
}: {
  release: BudgetRelease;
  token: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [decision, setDecision] = useState<"Approved" | "Withheld" | "Rejected">("Approved");
  const [amount, setAmount] = useState(String(release.amountRequested));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const approvedAmount = Number(amount);
    setSaving(true);
    setError("");
    try {
      await api.reviewBudgetRelease(token, release.id, decision, decision === "Approved" ? approvedAmount : 0, notes.trim() || undefined);
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to review release.");
      setSaving(false);
    }
  };

  return (
    <Dialog
      title="Review budget release"
      description={`${money(release.amountRequested)} requested. Approval is blocked when required conditions are not satisfied.`}
      icon="fact_check"
      size="sm"
      onClose={onClose}
      closeOnBackdrop={!saving}
      showCloseButton={!saving}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving…" : "Submit review"}</button>
        </div>
      }
    >
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Decision</span>
          <select value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100">
            <option>Approved</option>
            <option>Withheld</option>
            <option>Rejected</option>
          </select>
        </label>
        {decision === "Approved" && <Field label="Approved amount" value={amount} onChange={setAmount} type="number" />}
        <Field label="Notes" value={notes} onChange={setNotes} />
      </div>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
    </label>
  );
}
