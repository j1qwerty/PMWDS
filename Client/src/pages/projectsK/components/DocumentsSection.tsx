import { useCallback, useEffect, useMemo, useState } from "react";
import type { Milestone, ProjectDocument, Task } from "../../../types";
import { api } from "../../../api";
import { onDataChanged } from "../../../realtime";
import { DOCUMENT_SCOPES } from "../../../realtimeScopes";
import { Dialog, PERMISSION_GROUPS, usePermission, useToast, UtilizationCertificates } from "../../shared";

interface DocumentsSectionProps {
  projectId: string;
  authToken?: string | null;
  /** Optional — lets a utilization certificate be linked to the work it pays for. */
  milestones?: Milestone[];
  tasks?: Task[];
}

export function DocumentsSection({
  projectId,
  authToken,
  milestones = [],
  tasks = [],
}: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<ProjectDocument | null>(null);
  const [approvalAction, setApprovalAction] = useState<"Approved" | "Rejected" | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const perm = usePermission();
  const { addToast } = useToast();
  const canApproveDocuments = perm.has(PERMISSION_GROUPS.project.manage);

  // Utilization certificates render in their own block below, so keep them out
  // of the plain document list to avoid showing the same file twice.
  const plainDocuments = useMemo(
    () => documents.filter((doc) => doc.category !== "UtilizationCertificate"),
    [documents],
  );

  const fetchDocuments = useCallback(() => {
    if (!authToken || !projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getProjectDocuments(authToken, projectId)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [authToken, projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Keep the list in sync with other sessions. Document rows live in the DB and the bytes
  // on disk, and the API now broadcasts a `documents` change on upload, so a file added in
  // another browser appears here without a reload.
  useEffect(() => {
    let debounceTimer: number | undefined;

    const stopListening = onDataChanged((notification) => {
      if (!DOCUMENT_SCOPES.includes(notification.scope)) return;
      if (notification.projectId && notification.projectId !== projectId) return;
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = undefined;
        fetchDocuments();
      }, 250);
    });

    return () => {
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      stopListening();
    };
  }, [projectId, fetchDocuments]);

  const handleFileUpload = async () => {
    if (!authToken || !uploadFile) return;
    await api.uploadProjectDocument(authToken, projectId, uploadFile);
    setUploadFile(null);
    fetchDocuments();
  };

  const handleDownload = async (doc: ProjectDocument) => {
    if (!authToken) return;
    setDownloadingId(doc.id);
    try {
      const blob = await api.downloadProjectDocument(authToken, projectId, doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } finally {
      setDownloadingId(null);
    }
  };

  const submitApproval = async () => {
    if (!authToken || !approvalTarget || !approvalAction) return;

    setApprovingId(approvalTarget.id);
    try {
      const updated = await api.setProjectDocumentApproval(
        authToken,
        projectId,
        approvalTarget.id,
        approvalAction === "Approved",
        approvalNotes.trim() || undefined,
      );

      setDocuments((current) =>
        current.map((document) => document.id === updated.id ? updated : document),
      );
      addToast(
        approvalAction === "Approved" ? "Document approved." : "Document rejected.",
      );
      setApprovalTarget(null);
      setApprovalAction(null);
      setApprovalNotes("");
    } catch (cause) {
      addToast(
        cause instanceof Error ? cause.message : "Failed to update document approval.",
        "error",
      );
    } finally {
      setApprovingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-600">description</span>
          Documents
        </h3>
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-200">
          <span className="material-symbols-outlined text-[16px]">upload_file</span>
          Upload Document
          <input
            type="file"
            className="hidden"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {/* Utilization Certificates — finance compliance documents with their own
          review lifecycle, surfaced at the top of the Documents section. */}
      <UtilizationCertificates projectId={projectId} milestones={milestones} tasks={tasks} />

      {/* File preview */}
      {uploadFile && (
        <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-indigo-600">description</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{uploadFile.name}</p>
              <p className="text-[11px] text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setUploadFile(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFileUpload}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Upload
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="material-symbols-outlined text-slate-400 animate-spin">progress_activity</span>
        </div>
      ) : plainDocuments.length > 0 ? (
        <div className="space-y-2">
          {plainDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3 hover:bg-slate-100/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="size-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-indigo-600 text-[18px]">description</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                    {doc.approvalStatus && doc.approvalStatus !== "NotRequired" && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        doc.approvalStatus === "Approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : doc.approvalStatus === "Rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                      }`}>
                        {doc.approvalStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {formatFileSize(doc.fileSizeBytes)} &middot;{" "}
                    {new Date(doc.createdDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {canApproveDocuments && doc.approvalStatus === "Pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setApprovalTarget(doc);
                        setApprovalAction("Approved");
                        setApprovalNotes("");
                      }}
                      disabled={approvingId === doc.id}
                      className="size-9 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      title="Approve document"
                      aria-label="Approve document"
                    >
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setApprovalTarget(doc);
                        setApprovalAction("Rejected");
                        setApprovalNotes("");
                      }}
                      disabled={approvingId === doc.id}
                      className="size-9 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Reject document"
                      aria-label="Reject document"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  disabled={downloadingId === doc.id}
                  className="size-9 rounded-lg flex items-center justify-center border border-slate-200 hover:bg-white transition-colors disabled:opacity-50"
                  title="Download"
                  aria-label="Download document"
                >
                  <span className="material-symbols-outlined text-indigo-600 text-[18px]">
                    {downloadingId === doc.id ? "hourglass_top" : "download"}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <span
              className="material-symbols-outlined text-slate-400 text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              folder_open
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500">No documents uploaded yet</p>
          <p className="text-xs text-slate-400 mt-1">Upload project documents, specs, or reports.</p>
        </div>
      )}
      {approvalTarget && approvalAction && (
        <Dialog
          title={approvalAction === "Approved" ? "Approve document" : "Reject document"}
          description={approvalTarget.title}
          icon={approvalAction === "Approved" ? "task_alt" : "block"}
          size="sm"
          onClose={() => {
            if (approvingId) return;
            setApprovalTarget(null);
            setApprovalAction(null);
            setApprovalNotes("");
          }}
          closeOnBackdrop={!approvingId}
          showCloseButton={!approvingId}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setApprovalTarget(null);
                  setApprovalAction(null);
                  setApprovalNotes("");
                }}
                disabled={!!approvingId}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitApproval()}
                disabled={!!approvingId}
                className={approvalAction === "Approved"
                  ? "rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  : "rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"}
              >
                {approvingId ? "Saving…" : approvalAction === "Approved" ? "Approve document" : "Reject document"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              {approvalAction === "Approved"
                ? "This document will count as an approved project document for budget release workflows that require document approval."
                : "This document will no longer satisfy document-approval conditions until it is approved."}
            </p>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Review notes</span>
              <textarea
                rows={3}
                value={approvalNotes}
                onChange={(event) => setApprovalNotes(event.target.value)}
                placeholder="Optional review notes"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>
        </Dialog>
      )}

    </div>
  );
}
