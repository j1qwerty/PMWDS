import type { User } from "../../types";

type UserSelectProps = {
  users: User[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allowEmpty?: boolean;
};

export function UserSelect({ users, value, onChange, label = "Assignee", allowEmpty = true }: UserSelectProps) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {allowEmpty ? <option value="">Unassigned</option> : null}
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.fullName}
          </option>
        ))}
      </select>
    </label>
  );
}
