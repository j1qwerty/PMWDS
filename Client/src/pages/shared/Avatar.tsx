import type { User, WorkloadMember } from "../../types";

type AvatarPerson = Partial<User> &
  Partial<WorkloadMember> & {
    id?: string;
    userId?: string;
    name?: string;
    profilePictureUrl?: string | null;
    fullName?: string | null;
    email?: string | null;
  };

type AvatarProps = {
  person?: AvatarPerson | null;
  name?: string | null;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClass = {
  xs: "size-5 text-[9px]",
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
  xl: "size-20 text-xl",
};

const apiOrigin = (() => {
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v\d+\/?$/, "").replace(/\/$/, "");
  return base || "http://localhost:5177";
})();

export function getAvatarUrl(person?: AvatarPerson | null, nameOverride?: string | null, srcOverride?: string | null) {
  const source = srcOverride || person?.profilePictureUrl || "";
  if (source) {
    return source.startsWith("/") ? `${apiOrigin}${source}` : source;
  }

  const label = nameOverride || person?.fullName || person?.name || person?.email || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=e2e8f0&color=475569&size=128`;
}

export function Avatar({ person, name, src, size = "md", className = "" }: AvatarProps) {
  const label = name || person?.fullName || person?.name || person?.email || "User";

  return (
    <img
      className={`${sizeClass[size]} rounded-full object-cover ring-2 ring-white shadow-sm bg-slate-100 ${className}`}
      src={getAvatarUrl(person, name, src)}
      alt={label}
      loading="lazy"
    />
  );
}

export function AvatarStack({ people, limit = 4, size = "sm" }: { people: AvatarPerson[]; limit?: number; size?: AvatarProps["size"] }) {
  const visible = people.slice(0, limit);
  const extra = Math.max(people.length - visible.length, 0);

  return (
    <div className="flex -space-x-2">
      {visible.map((person, index) => (
        <Avatar
          key={person.id || person.userId || `${person.fullName || person.name || "user"}-${index}`}
          person={person}
          size={size}
          className="border border-white"
        />
      ))}
      {extra > 0 && (
        <span className={`${sizeClass[size ?? "sm"]} grid place-items-center rounded-full border border-white bg-slate-100 font-semibold text-slate-500 ring-2 ring-white`}>
          +{extra}
        </span>
      )}
    </div>
  );
}
