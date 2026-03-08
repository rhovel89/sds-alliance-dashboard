export function norm(value: unknown): string {
  return String(value ?? "").trim();
}

export function normLower(value: unknown): string {
  return norm(value).toLowerCase();
}

export function safeSlug(value: unknown): string {
  return normLower(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
