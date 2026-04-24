import type { Project } from "../../types";

type ProjectSelectProps = {
  projects: Project[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allowEmpty?: boolean;
};

export function ProjectSelect({ projects, value, onChange, label = "Project", allowEmpty }: ProjectSelectProps) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
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
