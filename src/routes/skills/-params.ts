export const sortKeys = [
  "relevance",
  "rating",
  "downloads",
  "trending",
  "newest",
  "name",
] as const;

export type SortKey = (typeof sortKeys)[number];
export type ListSortKey = Exclude<SortKey, "relevance">;
export type SortDir = "asc" | "desc";

export function parseSort(value: unknown): SortKey {
  if (typeof value !== "string") return "downloads";
  if ((sortKeys as readonly string[]).includes(value)) return value as SortKey;
  return "downloads";
}

export function parseDir(value: unknown, sort: SortKey): SortDir {
  if (value === "asc" || value === "desc") return value;
  return sort === "name" ? "asc" : "desc";
}

export function toListSort(sort: SortKey): ListSortKey {
  // "relevance", "rating", and "trending" are not direct DB sort keys;
  // fall back to "downloads" for the page fetch (client re-sorts).
  if (sort === "relevance" || sort === "rating" || sort === "trending") return "downloads";
  return sort;
}
