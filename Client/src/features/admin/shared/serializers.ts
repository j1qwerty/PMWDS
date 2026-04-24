export function parseLineList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stringifyLineList(values: string[] | undefined) {
  return (values ?? []).join("\n");
}

export function parseJsonMap(value: string) {
  if (!value.trim()) {
    return {};
  }

  return JSON.parse(value) as Record<string, unknown>;
}

export function stringifyJsonMap(value: Record<string, unknown> | undefined) {
  return JSON.stringify(value ?? {}, null, 2);
}
