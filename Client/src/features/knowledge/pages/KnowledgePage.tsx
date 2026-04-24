import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
import type { KnowledgeArticleRecord, LessonLearnedRecord, Project } from "../../../types";
import { KnowledgeArticleFormDialog } from "../components/KnowledgeArticleFormDialog";
import { LessonFormDialog } from "../components/LessonFormDialog";

export function KnowledgePage() {
  const { auth } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticleRecord[]>([]);
  const [lessons, setLessons] = useState<LessonLearnedRecord[]>([]);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticleRecord | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonLearnedRecord | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<KnowledgeArticleRecord | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<LessonLearnedRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    if (!auth) {
      return Promise.resolve();
    }

    return Promise.all([
      api.getProjects(auth.token),
      api.getKnowledgeArticles(auth.token),
      api.getLessons(auth.token),
    ])
      .then(([projectData, articleData, lessonData]) => {
        setProjects(projectData);
        setArticles(articleData);
        setLessons(lessonData);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Failed to load knowledge.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void refresh();
  }, [auth]);

  if (loading) {
    return <LoadingPanel label="Loading knowledge..." />;
  }

  if (error) {
    return <ErrorPanel message={error} />;
  }

  return (
    <div className="page-grid">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Knowledge Articles" subtitle="Capture reusable process knowledge, notes, and project-specific guidance">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Project</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td>
                    <strong>{article.title}</strong>
                    <div className="table-sub">{article.tags.join(", ")}</div>
                  </td>
                  <td>{article.category}</td>
                  <td>{projects.find((project) => project.id === article.projectId)?.name ?? "General"}</td>
                  <td>
                    <div className="inline-actions">
                      <button className="ghost-button" onClick={() => setEditingArticle(article)}>Edit</button>
                      <button className="danger-button" onClick={() => setDeletingArticle(article)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="inline-actions">
          <button className="primary-button" onClick={() => setEditingArticle({} as KnowledgeArticleRecord)}>
            Create Article
          </button>
        </div>
      </Panel>
      <Panel title="Lessons Learned" subtitle="Track reusable delivery lessons and project retrospectives">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Project</th>
                <th>Impact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson) => (
                <tr key={lesson.id}>
                  <td>
                    <strong>{lesson.title}</strong>
                    <div className="table-sub">{lesson.keywords.join(", ")}</div>
                  </td>
                  <td>{projects.find((project) => project.id === lesson.projectId)?.name ?? lesson.projectId}</td>
                  <td>{lesson.impact}</td>
                  <td>
                    <div className="inline-actions">
                      <button className="ghost-button" onClick={() => setEditingLesson(lesson)}>Edit</button>
                      <button className="danger-button" onClick={() => setDeletingLesson(lesson)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="inline-actions">
          <button className="primary-button" onClick={() => setEditingLesson({} as LessonLearnedRecord)}>
            Create Lesson
          </button>
        </div>
      </Panel>
      <KnowledgeArticleFormDialog
        open={editingArticle !== null}
        article={editingArticle?.id ? editingArticle : undefined}
        projects={projects}
        onClose={() => setEditingArticle(null)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          const action = editingArticle?.id
            ? api.updateKnowledgeArticle(auth.token, editingArticle.id, payload)
            : api.createKnowledgeArticle(auth.token, payload);

          void action.then(() => {
            setEditingArticle(null);
            setMessage(editingArticle?.id ? "Article updated." : "Article created.");
            void refresh();
          });
        }}
      />
      <LessonFormDialog
        open={editingLesson !== null}
        lesson={editingLesson?.id ? editingLesson : undefined}
        projects={projects}
        onClose={() => setEditingLesson(null)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          const action = editingLesson?.id
            ? api.updateLesson(auth.token, editingLesson.id, payload)
            : api.createLesson(auth.token, payload);

          void action.then(() => {
            setEditingLesson(null);
            setMessage(editingLesson?.id ? "Lesson updated." : "Lesson created.");
            void refresh();
          });
        }}
      />
      <ConfirmDialog
        open={deletingArticle !== null}
        title="Delete Article"
        message={`Delete ${deletingArticle?.title}?`}
        onClose={() => setDeletingArticle(null)}
        onConfirm={() =>
          auth && deletingArticle
            ? api.deleteKnowledgeArticle(auth.token, deletingArticle.id).then(() => {
                setDeletingArticle(null);
                setMessage("Article deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={deletingLesson !== null}
        title="Delete Lesson"
        message={`Delete ${deletingLesson?.title}?`}
        onClose={() => setDeletingLesson(null)}
        onConfirm={() =>
          auth && deletingLesson
            ? api.deleteLesson(auth.token, deletingLesson.id).then(() => {
                setDeletingLesson(null);
                setMessage("Lesson deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
