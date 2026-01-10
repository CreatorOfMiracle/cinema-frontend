export function formatLocalDateTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString();
}

export function toDateTimeLocalValue(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function toIsoFromDateTimeLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return date.toISOString();
}

