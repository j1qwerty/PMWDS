import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DocumentLevel,
  DocumentUploadCapabilities,
  Milestone,
  ProjectDocument,
  Task,
} from "../../../types";
import { DOCUMENT_LEVELS } from "../../../types";
import { api } from "../../../api";
import { onDataChanged } from "../../../realtime";
import { DOCUMENT_SCOPES } from "../../../realtimeScopes";
import { UtilizationCertificates, usePermission, PERMISSION_GROUPS } from "../../shared";

interface DocumentsSectionProps {
  projectId: string;
  authToken?: string | null;
  /** Lets a document be filed against the work it belongs to. */
  milestones?: Milestone[];
  tasks?: Task[];
  /** Compact layout for embedding in a summary card rather than a full tab. */
  variant?: "full" | "compact";
}

/**
 * The documents section of a project.
 *
 * Organised by level rather than as one list, because a project-level drawing,
 * a milestone-level inspection report and a task-level timesheet are different
 * kinds of thing and were previously indistinguishable in a single list. Each tab
 * shows the milestone and project a row sits under, so a task-level document says
 * which milestone it belongs to without the reader having to go and look.
 *
 * The upload level is a permission per level, so the dialog offers only the levels
 * the API has confirmed, read from the capabilities endpoint rather than inferred
 * from a role name.
 */
export function DocumentsSection({
  projectId,
  authToken,
  milestones = [],
  tasks = [],
  variant = "full",
}: DocumentsSectionProps) {
  const perm = usePermission();

  const [activeTab, setActiveTab] = useState<DocumentLevel>("Project");
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<DocumentUploadCapabilities | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Pending upload: the chosen file plus the level it is destined for.
  const [pending, setPending] = useState<{
    file: File;
    level: DocumentLevel;
    milestoneId?: string;
    taskId?: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canView = perm.has(PERMISSION_GROUPS.document.view);
  const canDelete = perm.has(PERMISSION_GROUPS.document.delete);
  const canUploadAnything = Boolean(capabilities?.documentLevels.length);

  /**
   * Utilization certificates render in their own block, so they are kept out of
   * the level tabs to avoid showing the same file twice.
   */
  const plainDocuments = useMemo(
    () => documents.filter((doc) => doc.category !== "UtilizationCertificate"),
    [documents],
  );

  const fetchDocuments = useCallback(() => {
    if (!authToken || !projectId || !canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getProjectDocuments(authToken, projectId)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [authToken, projectId, canView]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (!authToken) return;
    api
      .getDocumentUploadCapabilities(authToken)
      .then(setCapabilities)
      .catch(() => setCapabilities(null));
  }, [authToken]);

  // Keep the list in sync with other sessions. Document rows live in the DB and the
  // bytes on disk, and the API broadcasts a `documents` change on upload, so a file
  // added in another browser appears here without a reload.
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

  const uploadableLevels = useMemo(() => capabilities?.documentLevels ?? [], [capabilities]);

  /**
   * The tab actually shown.
   *
   * Derived rather than corrected in an effect: a team member whose only
   * permitted level is Task should never be left sitting on the Project tab,
   * which they cannot do anything with, and deriving it avoids a render that
   * briefly shows the wrong tab.
   */
  const effectiveTab: DocumentLevel =
    uploadableLevels.length > 0 && !uploadableLevels.includes(activeTab)
      ? uploadableLevels[0]
      : activeTab;

  const documentsForActiveTab = useMemo(
    () => plainDocuments.filter((doc) => (doc.level ?? "Project") === effectiveTab),
    [plainDocuments, effectiveTab],
  );

  const countsByLevel = useMemo(() => {
    const counts: Record<DocumentLevel, number> = { Project: 0, Milestone: 0, Task: 0 };
    for (const doc of plainDocuments) {
      const level = doc.level ?? "Project";
      counts[level] += 1;
    }
    return counts;
  }, [plainDocuments]);

  const startUpload = (file: File, level: DocumentLevel) => {
    setUploadError(null);

    // A level that needs a target cannot be chosen without one, so the dialog
    // offers to pick the target first rather than failing on submit.
    if (level === "Milestone" && milestones.length === 0) {
      setUploadError(
        "This project has no milestones yet, so there is nothing to file a milestone-level document against.",
      );
      return;
    }
    if (level === "Task" && tasks.length === 0) {
      setUploadError(
        "This project has no tasks yet, so there is nothing to file a task-level document against.",
      );
      return;
    }

    setPending({ file, level });
  };

  const handleUpload = async () => {
    if (!authToken || !pending) return;
    setUploading(true);
    setUploadError(null);
    try {
      await api.uploadProjectDocument(authToken, projectId, pending.file, {
        level: pending.level,
        milestoneId: pending.level === "Milestone" ? pending.milestoneId : undefined,
        taskId: pending.level === "Task" ? pending.taskId : undefined,
      });
      setPending(null);
      fetchDocuments();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: ProjectDocument) => {
    if (!authToken) return;
    await api.deleteProjectDocument(authToken, projectId, doc.id);
    fetchDocuments();
  };

  const handleDownload = async (doc: ProjectDocument) => {
    if (!authToken) return;
    setDownloadingId(doc.id);
    try {
      const blob = await api.downloadProjectDocument(authToken, projectId, doc.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.title;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (!canView) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-600">description</span>
          Documents
        </h3>

        {canUploadAnything && (
          <UploadMenu levels={uploadableLevels} onPick={(level, file) => startUpload(file, level)} />
        )}
      </div>

      {/* Utilization Certificates — finance compliance documents with their own
          review lifecycle, kept in their own tab rather than mixed in with the
          ordinary document levels. */}
      <UtilizationCertificates projectId={projectId} milestones={milestones} tasks={tasks} />

      {/* Level tabs. Only levels the user can act on are offered; the others would
          be tabs whose every action is a 403. */}
      <div className="flex gap-1 border-b border-slate-200">
        {DOCUMENT_LEVELS.filter((level) => canUploadAnything || level === "Project").map(
          (level) => (
            <button
              key={level}
              onClick={() => setActiveTab(level)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                effectiveTab === level
                  ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {level} documents
              <span className="ml-1.5 text-[10px] text-slate-400">{countsByLevel[level]}</span>
            </button>
          ),
        )}
      </div>

      {uploadError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {uploadError}
        </p>
      )}

      {/* Pending upload, with the target picker the level implies. */}
      {pending && (
        <UploadPreview
          pending={pending}
          milestones={milestones}
          tasks={tasks}
          uploading={uploading}
          onChange={setPending}
          onCancel={() => setPending(null)}
          onConfirm={handleUpload}
          formatFileSize={formatFileSize}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="material-symbols-outlined text-slate-400 animate-spin">
            progress_activity
          </span>
        </div>
      ) : documentsForActiveTab.length > 0 ? (
        <DocumentTable
          documents={documentsForActiveTab}
          level={effectiveTab}
          projectId={projectId}
          canDelete={canDelete}
          downloadingId={downloadingId}
          onDownload={handleDownload}
          onDelete={handleDelete}
          formatFileSize={formatFileSize}
          formatDate={formatDate}
          compact={variant === "compact"}
        />
      ) : (
        <EmptyState level={effectiveTab} canUpload={canUploadAnything} />
      )}
    </div>
  );
}

/**
 * The upload control.
 *
 * One button per permitted level rather than a single "Upload Document", because
 * where a document lands is a decision the person making it has to make
 * deliberately. The levels offered are exactly the ones the API confirmed, so an
 * option can never fail on submit.
 */
function UploadMenu({
  levels,
  onPick,
}: {
  levels: DocumentLevel[];
  onPick: (level: DocumentLevel, file: File) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] text-slate-400">
        {levels.length === 1
          ? `Upload at ${levels[0].toLowerCase()} level`
          : "Upload at level"}
      </span>
      {levels.map((level) => (
        <label
          key={level}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-200"
          title={`Attach the document to ${
            level === "Project" ? "the project itself" : `a ${level.toLowerCase()}`
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">upload_file</span>
          {level}
          <input
            type="file"
            className="hidden"
            onChange={(event) => {
              const input = event.target as HTMLInputElement;
              const file = input.files?.[0];
              if (file) onPick(level, file);
              // Reset so re-picking the same file fires change again.
              input.value = "";
            }}
          />
        </label>
      ))}
    </div>
  );
}

/** Shows the chosen file and whatever target the chosen level requires. */
function UploadPreview({
  pending,
  milestones,
  tasks,
  uploading,
  onChange,
  onCancel,
  onConfirm,
  formatFileSize,
}: {
  pending: { file: File; level: DocumentLevel; milestoneId?: string; taskId?: string };
  milestones: Milestone[];
  tasks: Task[];
  uploading: boolean;
  onChange: (next: { file: File; level: DocumentLevel; milestoneId?: string; taskId?: string }) => void;
  onCancel: () => void;
  onConfirm: () => void;
  formatFileSize: (bytes: number) => string;
}) {
  const needsMilestone = pending.level === "Milestone" && !pending.milestoneId;
  const needsTask = pending.level === "Task" && !pending.taskId;
  const blocked = needsMilestone || needsTask;

  return (
    <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-indigo-600">description</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{pending.file.name}</p>
            <p className="text-[11px] text-slate-500">
              {formatFileSize(pending.file.size)} &middot; {pending.level} level
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={uploading || blocked}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>

      {pending.level === "Milestone" && (
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Attach to milestone <span className="text-red-500">*</span>
          </span>
          <select
            value={pending.milestoneId ?? ""}
            onChange={(event) => onChange({ ...pending, milestoneId: event.target.value })}
            className="mt-1 w-full p-2 rounded-lg border border-indigo-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Select a milestone…</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {pending.level === "Task" && (
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Attach to task <span className="text-red-500">*</span>
          </span>
          <select
            value={pending.taskId ?? ""}
            onChange={(event) => onChange({ ...pending, taskId: event.target.value })}
            className="mt-1 w-full p-2 rounded-lg border border-indigo-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Select a task…</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

/** The document rows for one level. */
function DocumentTable({
  documents,
  level,
  projectId,
  canDelete,
  downloadingId,
  onDownload,
  onDelete,
  formatFileSize,
  formatDate,
  compact,
}: {
  documents: ProjectDocument[];
  level: DocumentLevel;
  projectId: string;
  canDelete: boolean;
  downloadingId: string | null;
  onDownload: (doc: ProjectDocument) => void;
  onDelete: (doc: ProjectDocument) => void;
  formatFileSize: (bytes: number) => string;
  formatDate: (value: string) => string;
  compact: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-3 py-2 font-semibold">Title</th>
            {level !== "Project" && <th className="px-3 py-2 font-semibold">Milestone</th>}
            {level === "Task" && <th className="px-3 py-2 font-semibold">Project</th>}
            {!compact && <th className="px-3 py-2 font-semibold">Size</th>}
            {!compact && <th className="px-3 py-2 font-semibold">Uploaded</th>}
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-indigo-600 text-[16px]">
                      description
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{doc.title}</p>
                    {doc.category && doc.category !== "General" && (
                      <span className="text-[10px] text-slate-400">{doc.category}</span>
                    )}
                  </div>
                </div>
              </td>

              {level !== "Project" && (
                <td className="px-3 py-2.5 text-xs text-slate-600">
                  {doc.milestoneName ?? <span className="text-slate-300">—</span>}
                </td>
              )}

              {level === "Task" && (
                <td className="px-3 py-2.5 text-xs text-slate-600">
                  {doc.projectName ?? projectId.slice(0, 8)}
                </td>
              )}

              {!compact && (
                <td className="px-3 py-2.5 text-xs text-slate-500">
                  {formatFileSize(doc.fileSizeBytes)}
                </td>
              )}

              {!compact && (
                <td className="px-3 py-2.5 text-xs text-slate-500">{formatDate(doc.createdDate)}</td>
              )}

              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-1">
                  {canDelete && (
                    <button
                      onClick={() => onDelete(doc)}
                      className="size-8 rounded-lg flex items-center justify-center border border-slate-200 hover:bg-red-50 transition-colors shrink-0"
                      title="Delete document"
                    >
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">
                        delete
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => onDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="size-8 rounded-lg flex items-center justify-center border border-slate-200 hover:bg-white transition-colors disabled:opacity-50 shrink-0"
                    title="Download"
                  >
                    <span className="material-symbols-outlined text-indigo-600 text-[16px]">
                      {downloadingId === doc.id ? "hourglass_top" : "download"}
                    </span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ level, canUpload }: { level: DocumentLevel; canUpload: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <span
          className="material-symbols-outlined text-slate-400 text-3xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          folder_open
        </span>
      </div>
      <p className="text-sm font-medium text-slate-500">No {level.toLowerCase()}-level documents</p>
      <p className="text-xs text-slate-400 mt-1">
        {canUpload
          ? `Upload a document and it will be filed against the ${
              level === "Project" ? "project" : level.toLowerCase()
            } you pick.`
          : "You do not have permission to upload documents at this level."}
      </p>
    </div>
  );
}
