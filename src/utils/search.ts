export function normalizeSearch(value: string | number | undefined | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function includesSearch(haystack: Array<string | number | undefined | null>, query: string) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;
  return haystack.some((value) => normalizeSearch(value).includes(normalizedQuery));
}

export function isWithinDateFilter(dateValue: string, filter: string) {
  if (!filter) return true;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(startOfToday);

  if (filter === "today") {
    return date >= startOfToday;
  }

  if (filter === "week") {
    start.setDate(start.getDate() - 7);
    return date >= start;
  }

  if (filter === "month") {
    start.setMonth(start.getMonth() - 1);
    return date >= start;
  }

  return true;
}
