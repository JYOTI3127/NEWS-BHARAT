const REGION_ALIAS_TO_CANONICAL = new Map([
  ["andaman nicobar islands", "Andaman & Nicobar Islands"],
  ["andaman and nicobar islands", "Andaman & Nicobar Islands"],
  ["dadra nagar haveli and daman diu", "Dadra & Nagar Haveli and Daman & Diu"],
  ["dadra and nagar haveli and daman and diu", "Dadra & Nagar Haveli and Daman & Diu"],
  ["delhi nct", "Delhi (NCT)"],
  ["delhi", "Delhi (NCT)"],
  ["jammu kashmir", "Jammu & Kashmir"],
  ["jammu and kashmir", "Jammu & Kashmir"],
]);

export const normalizeRegionKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\(nct\)/g, "")
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const canonicalizeRegionName = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return REGION_ALIAS_TO_CANONICAL.get(normalizeRegionKey(raw)) || raw;
};

