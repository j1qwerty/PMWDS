import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit3, FiRefreshCw, FiSave, FiSearch } from "react-icons/fi";
import { useAuth } from "./auth";
import { PageTitle } from "./components";
import type { GenericRecord } from "./types";
import { classNames, formatDate } from "./utils";

export type FieldConfig = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "checkbox" | "date";
  options?: string[];
  required?: boolean;
};

export type ResourcePageConfig<T extends GenericRecord> = {
  eyebrow: string;
  title: string;
  description: string;
  columns: FieldConfig[];
  form: FieldConfig[];
  load: (token: string) => Promise<T[]>;
  create?: (token: string, payload: Record<string, unknown>) => Promise<unknown>;
  update?: (token: string, id: string, payload: Record<string, unknown>) => Promise<unknown>;
  demo: T[];
  searchKeys?: string[];
};

export function ResourcePage<T extends GenericRecord>({ config }: { config: ResourcePageConfig<T> }) {
  const { auth } = useAuth();
  const [rows, setRows] = useState<T[]>(config.demo);
  const [selected, setSelected] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!auth || auth.token === "demo-token") {
      setRows(config.demo);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      setRows(await config.load(auth.token));
    } catch (cause) {
      setRows(config.demo);
      setMessage(cause instanceof Error ? cause.message : "Endpoint unavailable. Showing demo records.");
    } finally {
      setLoading(false);
    }
  }, [auth, config]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    const keys = config.searchKeys ?? config.columns.map((column) => column.key);
    return rows.filter((row) =>
      keys.some((key) => String(row[key] ?? "").toLowerCase().includes(term)),
    );
  }, [config.columns, config.searchKeys, rows, search]);

  const pickRow = (row: T) => {
    setSelected(row);
    const next: Record<string, unknown> = {};
    config.form.forEach((field) => {
      next[field.key] = row[field.key] ?? "";
    });
    setForm(next);
  };

  const save = async () => {
    if (!auth) return;
    if (auth.token === "demo-token") {
      const id = selected?.id ?? `demo-${Date.now()}`;
      const next = { ...selected, ...form, id } as T;
      setRows((current) => (selected ? current.map((row) => (row.id === selected.id ? next : row)) : [next, ...current]));
      setSelected(next);
      setMessage("Demo record saved locally.");
      return;
    }

    try {
      if (selected?.id && config.update) await config.update(auth.token, selected.id, form);
      else if (config.create) await config.create(auth.token, form);
      else {
        setMessage("This endpoint is read-only in client2.");
        return;
      }
      await load();
      setMessage("Saved.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Save failed.");
    }
  };

  return (
    <>
      <PageTitle
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
        actions={
          <div className="quick-actions">
            <button className="icon-text-btn" onClick={() => void load()}>
              <FiRefreshCw />
              Refresh
            </button>
            {config.create ? (
              <button
                className="add-btn"
                onClick={() => {
                  setSelected(null);
                  setForm(Object.fromEntries(config.form.map((field) => [field.key, field.type === "checkbox" ? false : ""])));
                }}
              >
                New
              </button>
            ) : null}
          </div>
        }
      />
      {message ? <p className="message-line">{message}</p> : null}
      <section className="resource-layout">
        <div className="resource-table-card">
          <div className="resource-tools">
            <div className="resource-search">
              <FiSearch />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} />
            </div>
            <span>{loading ? "Loading" : `${visibleRows.length} records`}</span>
          </div>
          <div className="resource-table-wrap">
            <table className="resource-table">
              <thead>
                <tr>
                  {config.columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => (
                  <tr key={row.id ?? index} className={classNames(selected?.id === row.id && "selected")}>
                    {config.columns.map((column) => (
                      <td key={column.key}>{formatCell(row[column.key])}</td>
                    ))}
                    <td>
                      <button className="table-action" onClick={() => pickRow(row)}>
                        <FiEdit3 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="resource-editor">
          <h3>{selected ? "Edit record" : "Create record"}</h3>
          {config.form.map((field) => (
            <Field
              key={field.key}
              field={field}
              value={form[field.key]}
              onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
            />
          ))}
          <button className="save-btn" onClick={() => void save()}>
            <FiSave />
            Save
          </button>
        </aside>
      </section>
    </>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "textarea") {
    return (
      <label className="resource-field">
        <span>{field.label}</span>
        <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <label className="resource-field">
        <span>{field.label}</span>
        <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="resource-check">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <span>{field.label}</span>
      </label>
    );
  }
  return (
    <label className="resource-field">
      <span>{field.label}</span>
      <input
        type={field.type ?? "text"}
        value={String(value ?? "")}
        onChange={(event) => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)}
      />
    </label>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return "Object";
  return String(value);
}
