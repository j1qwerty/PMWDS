import { useEffect, useState } from "react";
import { ColorPicker, PageTitle } from "../../shared/components";

type UiSettings = {
  accent: string;
  density: "compact" | "comfortable";
  defaultView: "list" | "kanban";
  showUiHints: boolean;
  expandOnClick: boolean;
  sidebarMode: "full" | "compact";
};

const defaults: UiSettings = {
  accent: "#6366f1",
  density: "compact",
  defaultView: "list",
  showUiHints: false,
  expandOnClick: true,
  sidebarMode: "full",
};

export function SettingsPage() {
  const [settings, setSettings] = useState<UiSettings>(() => {
    const raw = localStorage.getItem("pmwds-client2-ui-settings");
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<UiSettings>) } : defaults;
  });

  useEffect(() => {
    localStorage.setItem("pmwds-client2-ui-settings", JSON.stringify(settings));
    document.documentElement.style.setProperty("--accent", settings.accent);
  }, [settings]);

  return (
    <>
      <PageTitle
        eyebrow="Settings"
        title="UI configuration"
        description="Controls from the project wireframe: color tags, compact density, default board mode, and expansion behavior."
      />
      <section className="settings-grid">
        <div className="settings-card">
          <h3>Appearance</h3>
          <SettingRow title="Accent color" detail="Applied to progress controls and selected interface states.">
            <ColorPicker value={settings.accent} onChange={(accent) => setSettings((current) => ({ ...current, accent }))} />
          </SettingRow>
          <SettingRow title="Color palette" detail="Available for projects, milestones, tasks, and subtasks.">
            <ColorPicker value={settings.accent} onChange={(accent) => setSettings((current) => ({ ...current, accent }))} />
          </SettingRow>
          <SettingRow title="Density" detail="Compact keeps expanded elements short for project management work.">
            <select value={settings.density} onChange={(event) => setSettings((current) => ({ ...current, density: event.target.value as UiSettings["density"] }))}>
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </SettingRow>
        </div>

        <div className="settings-card">
          <h3>Project Workspace</h3>
          <SettingRow title="Default view" detail="Choose compact hierarchy or kanban board first.">
            <select value={settings.defaultView} onChange={(event) => setSettings((current) => ({ ...current, defaultView: event.target.value as UiSettings["defaultView"] }))}>
              <option value="list">Compact hierarchy</option>
              <option value="kanban">Kanban board</option>
            </select>
          </SettingRow>
          <SettingRow title="Expand on click" detail="Milestones, tasks, and subtasks reveal details inline.">
            <input type="checkbox" checked={settings.expandOnClick} onChange={(event) => setSettings((current) => ({ ...current, expandOnClick: event.target.checked }))} />
          </SettingRow>
          <SettingRow title="Sidebar" detail="Store the preferred navigation width for future layout variants.">
            <select value={settings.sidebarMode} onChange={(event) => setSettings((current) => ({ ...current, sidebarMode: event.target.value as UiSettings["sidebarMode"] }))}>
              <option value="full">Full</option>
              <option value="compact">Compact</option>
            </select>
          </SettingRow>
        </div>

        <div className="settings-card">
          <h3>Operational Defaults</h3>
          <SettingRow title="UI hints" detail="Optional helper labels for onboarding users.">
            <input type="checkbox" checked={settings.showUiHints} onChange={(event) => setSettings((current) => ({ ...current, showUiHints: event.target.checked }))} />
          </SettingRow>
          <SettingRow title="Saved locally" detail="Settings persist in local storage for client2.">
            <button onClick={() => setSettings(defaults)}>Reset</button>
          </SettingRow>
          <div className="message-line">
            The backend settings API can be wired here later; this UI section is intentionally isolated from AI and database settings.
          </div>
        </div>
      </section>
    </>
  );
}

function SettingRow({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      {children}
    </div>
  );
}
