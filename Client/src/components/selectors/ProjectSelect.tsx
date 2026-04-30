import type { Project } from "../../types";
import { inputClass, labelClass } from "../../ui";

type ProjectSelectProps = {
  projects: Project[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allowEmpty?: boolean;
};

export function ProjectSelect({ projects, value, onChange, label = "Project", allowEmpty }: ProjectSelectProps) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {allowEmpty ? <option value="">All Projects</option> : null}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
