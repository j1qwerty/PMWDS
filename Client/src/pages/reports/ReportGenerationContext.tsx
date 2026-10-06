import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { AiReportResponse } from "../../types";

/**
 * Tracks in-flight report generations above the router so the "Generating..."
 * state survives navigation.
 *
 * Report generation is slow (an LLM round trip). Previously the flag lived in
 * ReportsPage local state, so switching pages unmounted the component, dropped
 * the flag, and let the same report type be triggered a second time while the
 * first request was still running. Holding the state here keeps it alive across
 * route changes and exposes which report type is currently pending.
 *
 * It also owns the last failure. A generation that fails is a real error the
 * user has to act on, so it stays on screen with a retry rather than living
 * only in a toast that disappears.
 */

type GenerationResult = {
  reportType: string;
  report: AiReportResponse;
  exportParams: Record<string, unknown>;
};

export type GenerationFailure = {
  reportType: string;
  reportLabel: string;
  message: string;
  /** True for a 502 from the AI provider, false for other failures. */
  providerIssue: boolean;
};

type ReportGenerationContextValue = {
  /** Report type currently being generated, or null when idle. */
  pendingReportType: string | null;
  isGenerating: boolean;
  /** True when a request for this specific report type is already in flight. */
  isGeneratingType: (reportType: string) => boolean;
  /** Runs the generation; rejects if the same type is already in flight. */
  generate: (
    reportType: string,
    body: Record<string, unknown>,
    exportParams: Record<string, unknown>,
  ) => Promise<GenerationResult>;
  /** Most recent successful generation, for consumers that mount late. */
  lastResult: GenerationResult | null;
  clearLastResult: () => void;
  /** Last failure, surfaced as a persistent banner with a retry action. */
  lastFailure: GenerationFailure | null;
  clearFailure: () => void;
};

const ReportGenerationContext = createContext<ReportGenerationContextValue | null>(null);

/**
 * Requests that outlive the default 100s HttpClient budget are normal here -
 * the configured model can take minutes - so give the fetch room before the
 * browser aborts it. A timeout at this layer is reported as such rather than
 * as a generic network failure.
 */
const GENERATION_TIMEOUT_MS = 11 * 60 * 1000;

export function ReportGenerationProvider({ children }: PropsWithChildren) {
  const { auth } = useAuth();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);
  const [lastFailure, setLastFailure] = useState<GenerationFailure | null>(null);

  // Mirrors `pending` for synchronous reads within the same tick, so a rapid
  // second click cannot slip through before React re-renders.
  const pendingRef = useRef<Set<string>>(new Set());

  const begin = useCallback((reportType: string) => {
    pendingRef.current.add(reportType);
    setPending(new Set(pendingRef.current));
  }, []);

  const end = useCallback((reportType: string) => {
    pendingRef.current.delete(reportType);
    setPending(new Set(pendingRef.current));
  }, []);

  const generate = useCallback(
    async (
      reportType: string,
      body: Record<string, unknown>,
      exportParams: Record<string, unknown>,
    ): Promise<GenerationResult> => {
      if (pendingRef.current.has(reportType)) {
        throw new Error("This report is already being generated.");
      }
      if (!auth) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      begin(reportType);
      // Clear any previous failure so a retry does not show two banners.
      setLastFailure(null);

      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

      try {
        const report = await api.generateReport(auth.token, reportType, body, controller.signal);
        const result: GenerationResult = { reportType, report, exportParams };
        setLastResult(result);
        return result;
      } catch (e) {
        const providerIssue = isProviderFailure(e);
        setLastFailure({
          reportType,
          reportLabel: reportType,
          message: controller.signal.aborted
            ? "The request took longer than expected and was stopped. Large models can take several minutes - try a smaller model, or raise AI__RequestTimeoutSeconds, then generate again."
            : e instanceof Error && e.message
              ? e.message
              : "Report generation failed for an unknown reason.",
          providerIssue,
        });
        throw e;
      } finally {
        window.clearTimeout(timer);
        end(reportType);
      }
    },
    [auth, begin, end],
  );

  const value = useMemo<ReportGenerationContextValue>(
    () => ({
      pendingReportType: pending.size > 0 ? Array.from(pending)[0] : null,
      isGenerating: pending.size > 0,
      isGeneratingType: (reportType: string) => pending.has(reportType),
      generate,
      lastResult,
      clearLastResult: () => setLastResult(null),
      lastFailure,
      clearFailure: () => setLastFailure(null),
    }),
    [pending, generate, lastResult, lastFailure],
  );

  return (
    <ReportGenerationContext.Provider value={value}>{children}</ReportGenerationContext.Provider>
  );
}

/** True when the failure came from the AI provider rather than the app. */
function isProviderFailure(e: unknown): boolean {
  const status = (e as { status?: number } | null)?.status;
  return status === 502 || status === 503;
}

export function useReportGeneration(): ReportGenerationContextValue {
  const context = useContext(ReportGenerationContext);
  if (!context) {
    throw new Error("useReportGeneration must be used inside ReportGenerationProvider.");
  }
  return context;
}
