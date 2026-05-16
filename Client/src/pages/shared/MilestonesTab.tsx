// components/MilestonesTab.tsx
import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Milestone, Task } from "../../types";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";

interface MilestonesTabProps {
  projectId: string;
  authToken?: string;
}

export function MilestonesTab({ projectId, authToken }: MilestonesTabProps) {
  const [activeTab, setActiveTab] = useState<"milestones" | "tasks" | "documents">("milestones");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const fetchData = () => {
    if (!authToken || !projectId) return;
    
    setLoading(true);
    Promise.allSettled([
      api.getMilestonesByProject(authToken, projectId),
      api.getTasksByProject(authToken, projectId),
    ]).then(([milestoneResult, taskResult]) => {
      if (milestoneResult.status === "fulfilled") {
        setMilestones(milestoneResult.value);
      }
      if (taskResult.status === "fulfilled") {
        setTasks(taskResult.value);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    setActiveTab("milestones");
    fetchData();
  }, [authToken, projectId]);

  const tasksByMilestone = tasks.reduce((acc, task) => {
    const key = task.milestoneId || "standalone";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleFileUpload = async () => {
    if (!authToken || !uploadFile) return;
    await api.uploadProjectDocument(authToken, projectId, uploadFile);
    setMessage("Document uploaded successfully.");
    setUploadFile(null);
  };

  return (
    <div style={{ marginTop: "8px" }}>
      {/* Tabs Header */}
      <div style={{ borderBottom: "1px solid #e0e3e5" }}>
        <div style={{ display: "flex", gap: "24px" }}>
          <button
            onClick={() => setActiveTab("milestones")}
            style={{
              paddingBottom: "12px",
              fontWeight: activeTab === "milestones" ? 600 : 400,
              fontSize: "14px",
              color: activeTab === "milestones" ? "#4648d4" : "#767586",
              borderBottom: activeTab === "milestones" ? "2px solid #4648d4" : "2px solid transparent",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { if (activeTab !== "milestones") e.currentTarget.style.color = "#191c1e"; }}
            onMouseLeave={(e) => { if (activeTab !== "milestones") e.currentTarget.style.color = "#767586"; }}
          >
            Milestones
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            style={{
              paddingBottom: "12px",
              fontWeight: activeTab === "tasks" ? 600 : 400,
              fontSize: "14px",
              color: activeTab === "tasks" ? "#4648d4" : "#767586",
              borderBottom: activeTab === "tasks" ? "2px solid #4648d4" : "2px solid transparent",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { if (activeTab !== "tasks") e.currentTarget.style.color = "#191c1e"; }}
            onMouseLeave={(e) => { if (activeTab !== "tasks") e.currentTarget.style.color = "#767586"; }}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            style={{
              paddingBottom: "12px",
              fontWeight: activeTab === "documents" ? 600 : 400,
              fontSize: "14px",
              color: activeTab === "documents" ? "#4648d4" : "#767586",
              borderBottom: activeTab === "documents" ? "2px solid #4648d4" : "2px solid transparent",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { if (activeTab !== "documents") e.currentTarget.style.color = "#191c1e"; }}
            onMouseLeave={(e) => { if (activeTab !== "documents") e.currentTarget.style.color = "#767586"; }}
          >
            Documents
          </button>
        </div>
      </div>

      {/* Milestones Tab Content */}
      {activeTab === "milestones" && (
        <div style={{ 
          marginTop: "24px",
          paddingLeft: "8px",
          borderLeft: "2px solid #e0e3e5",
          marginLeft: "16px",
        }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#767586", fontSize: "14px" }}>
              Loading milestones...
            </div>
          ) : milestones.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#767586", fontSize: "14px" }}>
              No milestones created yet for this project.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {milestones.map((milestone) => {
                const milestoneTasks = tasksByMilestone[milestone.id] || [];
                const isCompleted = milestone.status === "Completed";

                return (
                  <div key={milestone.id} style={{ position: "relative", paddingLeft: "24px" }}>
                    {/* Timeline dot */}
                    <div style={{
                      position: "absolute",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      left: "-7px",
                      top: "8px",
                      border: "2px solid #f7f9fb",
                      backgroundColor: isCompleted ? "#4648d4" : "#ffffff",
                      boxShadow: isCompleted ? "none" : "0 0 0 4px rgba(70,72,212,0.2)",
                      ...(isCompleted ? {} : { borderColor: "#4648d4" }),
                    }} />

                    {/* Milestone card */}
                    <div style={{
                      background: "rgba(255, 255, 255, 0.7)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      border: isCompleted ? "1px solid rgba(255, 255, 255, 0.4)" : "1px solid rgba(70,72,212,0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <h3 style={{
                          fontSize: "18px",
                          fontWeight: 600,
                          color: "#191c1e",
                          lineHeight: "1.6",
                          margin: 0,
                        }}>
                          {milestone.name}
                        </h3>
                        <StatusBadge status={milestone.status} />
                      </div>

                      {milestone.description && (
                        <div style={{ fontSize: "14px", color: "#767586", marginBottom: "12px" }}>
                          {milestone.description}
                        </div>
                      )}

                      {/* Tasks under this milestone */}
                      {milestoneTasks.length > 0 && (
                        <div style={{
                          marginTop: "16px",
                          paddingTop: "16px",
                          borderTop: "1px solid rgba(224,227,229,0.5)",
                        }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {milestoneTasks.map((task) => {
                              const taskDone = task.status === "Completed";

                              return taskDone ? (
                                // Completed task
                                <div key={task.id} style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  backgroundColor: "#f2f4f6",
                                  padding: "8px",
                                  borderRadius: "4px",
                                  fontSize: "14px",
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <span className="material-symbols-outlined" style={{ color: "#10B981", fontSize: "18px" }}>
                                      check_circle
                                    </span>
                                    <span style={{ textDecoration: "line-through", color: "#767586" }}>
                                      {task.title}
                                    </span>
                                  </div>
                                  {task.assignedToUserName && (
                                    <div style={{
                                      width: "20px",
                                      height: "20px",
                                      borderRadius: "50%",
                                      backgroundColor: "#e0e3e5",
                                      border: "1px solid #f7f9fb",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "8px",
                                      color: "#464554",
                                      fontWeight: 700,
                                    }}>
                                      {task.assignedToUserName.charAt(0)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // Active task
                                <div key={task.id} style={{
                                  backgroundColor: "#f7f9fb",
                                  padding: "12px",
                                  borderRadius: "8px",
                                  border: "1px solid #e0e3e5",
                                  transition: "box-shadow 0.2s",
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <input
                                        type="checkbox"
                                        style={{
                                          borderRadius: "4px",
                                          color: "#4648d4",
                                          borderColor: "#c7c4d7",
                                        }}
                                      />
                                      <span style={{ fontSize: "14px", fontWeight: 500, color: "#191c1e" }}>
                                        {task.title}
                                      </span>
                                    </div>
                                    <PriorityBadge priority={task.priority} />
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: "24px" }}>
                                    <div style={{
                                      width: "128px",
                                      height: "4px",
                                      backgroundColor: "#e6e8ea",
                                      borderRadius: "9999px",
                                      overflow: "hidden",
                                    }}>
                                      <div style={{
                                        height: "100%",
                                        backgroundColor: "#4648d4",
                                        borderRadius: "9999px",
                                        width: `${task.progressPercentage || 0}%`,
                                      }} />
                                    </div>
                                    {task.assignedToUserName && (
                                      <div style={{
                                        width: "20px",
                                        height: "20px",
                                        borderRadius: "50%",
                                        backgroundColor: "#e0e3e5",
                                        border: "1px solid #f7f9fb",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "8px",
                                        color: "#464554",
                                        fontWeight: 700,
                                      }}>
                                        {task.assignedToUserName.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tasks Tab Content */}
      {activeTab === "tasks" && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#191c1e", margin: 0 }}>All Tasks</h3>
              <button style={{
                color: "#4648d4",
                fontSize: "14px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add_task</span>
                Add Task
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {tasks.map((task) => {
                const parentMilestone = milestones.find(m => m.id === task.milestoneId);

                return (
                  <div key={task.id} style={{
                    backgroundColor: "rgba(242,244,246,0.5)",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(224,227,229,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <input
                        type="checkbox"
                        checked={task.status === "Completed"}
                        readOnly
                        style={{ borderRadius: "4px", color: "#4648d4", borderColor: "#c7c4d7" }}
                      />
                      <div>
                        <p style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#191c1e",
                          textDecoration: task.status === "Completed" ? "line-through" : "none",
                          margin: 0,
                        }}>
                          {task.title}
                        </p>
                        <p style={{ fontSize: "10px", color: "#767586", margin: "2px 0 0 0" }}>
                          {parentMilestone ? `Milestone: ${parentMilestone.name}` : "Standalone Task"}
                          {task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ""}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                );
              })}
              {tasks.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#767586", fontSize: "14px" }}>
                  No tasks found for this project.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab Content */}
      {activeTab === "documents" && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#191c1e", margin: 0 }}>Documents</h3>
              <label style={{
                color: "#4648d4",
                fontSize: "14px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>upload_file</span>
                Upload Document
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {uploadFile && (
              <div style={{
                backgroundColor: "rgba(70,72,212,0.05)",
                border: "1px solid rgba(70,72,212,0.2)",
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span className="material-symbols-outlined" style={{ color: "#4648d4" }}>description</span>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "#191c1e", margin: 0 }}>{uploadFile.name}</p>
                    <p style={{ fontSize: "10px", color: "#767586", margin: "2px 0 0 0" }}>{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setUploadFile(null)}
                    style={{
                      fontSize: "12px",
                      color: "#767586",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFileUpload}
                    style={{
                      padding: "4px 12px",
                      backgroundColor: "#4648d4",
                      color: "#ffffff",
                      fontSize: "12px",
                      borderRadius: "4px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Upload
                  </button>
                </div>
              </div>
            )}

            {message && (
              <div style={{
                backgroundColor: "#f0fdf4",
                color: "#15803d",
                fontSize: "14px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #bbf7d0",
              }}>
                {message}
              </div>
            )}

            {!uploadFile && !message && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#767586" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "36px", marginBottom: "12px", fontVariationSettings: "'FILL' 1" }}>
                  folder_open
                </span>
                <p style={{ fontSize: "14px", margin: "0 0 4px 0" }}>No documents uploaded yet.</p>
                <p style={{ fontSize: "12px", margin: 0 }}>Upload project documents, specs, or reports.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}