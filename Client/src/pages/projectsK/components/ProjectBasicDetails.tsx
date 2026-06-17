interface ProjectBasicDetailsProps {
  onClose: () => void;
  pendingWarning: {
    incompleteCount: number;
    totalCount: number;
  } | null;
  setPendingWarning: (
    warning: { incompleteCount: number; totalCount: number } | null
  ) => void;
  handleForceComplete: () => void | Promise<void>;
}

export function ProjectBasicDetails({
  onClose,
  pendingWarning,
  setPendingWarning,
  handleForceComplete,
}: ProjectBasicDetailsProps) {
  return (
    <>
    

      {/* Incomplete milestones warning */}
      {pendingWarning && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-600 mt-0.5 shrink-0">warning</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Incomplete milestones detected</p>
              <p className="text-xs text-amber-700 mt-1">
                <strong>{pendingWarning.incompleteCount}</strong> of <strong>{pendingWarning.totalCount}</strong> milestone(s) in this project are not completed.
                Continuing will mark all milestones as completed at 100% progress.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleForceComplete}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                >
                  Yes, complete all
                </button>
                <button
                  onClick={() => setPendingWarning(null)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
