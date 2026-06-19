export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}
