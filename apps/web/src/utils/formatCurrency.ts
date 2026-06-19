export function formatCurrency(value: string | number | null | undefined): string {
  if (!value) {
    return "";
  }
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) {
    return "";
  }
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(numeric);
}
