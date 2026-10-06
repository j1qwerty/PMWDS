import type { GenerationFailure } from "./ReportGenerationContext";

type GenerationErrorBannerProps = {
  failure: GenerationFailure;
  onRetry: () => void;
  onDismiss: () => void;
  retryDisabled: boolean;
};

/**
 * Persistent, actionable report generation failure.
 *
 * A failed generation used to render as a report-shaped document describing the
 * failure, which was then announced as a success and stored in the user's list.
 * This is the replacement: the failure stays on screen, names the report, gives
 * the provider's own message, and offers a retry. The provider hint is what
 * turns "it didn't work" into "your model id does not match your provider".
 */
export function GenerationErrorBanner({
  failure,
  onRetry,
  onDismiss,
  retryDisabled,
}: GenerationErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-red-500 text-xl shrink-0 mt-0.5">error</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-800">
            {failure.reportLabel} report was not generated
          </p>
          <p className="text-[12px] text-red-700 leading-relaxed mt-1.5">{failure.message}</p>

          {failure.providerIssue && (
            <div className="mt-3 p-3 rounded-xl bg-white border border-red-100">
              <p className="text-[11px] font-bold text-red-700 mb-1.5">Most likely causes</p>
              <ul className="space-y-1">
                {[
                  "No API key is saved for the selected provider, or the key is invalid or expired.",
                  "The model id does not belong to the selected provider - the most common cause.",
                  "The free-tier rate limit or credit balance was reached.",
                ].map((cause) => (
                  <li key={cause} className="flex gap-1.5 text-[11px] text-slate-600 leading-relaxed">
                    <span className="text-red-400 shrink-0">
                      <span className="material-symbols-outlined text-[13px]">chevron_right</span>
                    </span>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-500 mt-2.5">
                Check Settings &gt; AI Configuration, then use Test Provider to confirm the key and model
                work before generating again.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3.5">
            <button
              type="button"
              onClick={onRetry}
              disabled={retryDisabled}
              className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              {retryDisabled ? "Retrying..." : "Try again"}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="px-3.5 py-2 rounded-xl border border-red-200 bg-white text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
