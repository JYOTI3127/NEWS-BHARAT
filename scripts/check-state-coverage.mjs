import { canonicalizeRegionName, normalizeRegionKey } from "../src/lib/stateRegion.js";
const DEFAULT_API_BASE = "https://news4bharat.cloud/api";
const STATE_CATEGORY_SLUGS = new Set(["state-of-bharat", "states-of-bharat"]);

const FALLBACK_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const FALLBACK_UTS = [
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const argv = process.argv.slice(2);
const jsonMode = argv.includes("--json");
const onlyEmpty = argv.includes("--only-empty");
const apiBaseArg = argv.find((arg) => arg.startsWith("--api="));
const apiBase = process.env.API_BASE || (apiBaseArg ? apiBaseArg.replace("--api=", "") : DEFAULT_API_BASE);

const uniqueNames = (values = []) => {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const canonical = canonicalizeRegionName(value);
    if (!canonical) return;
    const key = normalizeRegionKey(canonical);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(canonical);
  });
  return result;
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
};

const extractListFromCategoryGroup = (group) => {
  if (!group || typeof group !== "object") return [];

  const directStates = Array.isArray(group["States of India"]) ? group["States of India"] : [];
  const directUTs = Array.isArray(group["Union Territories"]) ? group["Union Territories"] : [];
  if (directStates.length > 0 || directUTs.length > 0) {
    return { states: directStates, uts: directUTs };
  }

  const pairs = Object.entries(group);
  const fromStatesLabel = pairs.find(([label]) => String(label).toLowerCase().includes("state"));
  const fromUTLabel = pairs.find(([label]) => String(label).toLowerCase().includes("union"));

  return {
    states: Array.isArray(fromStatesLabel?.[1]) ? fromStatesLabel[1] : [],
    uts: Array.isArray(fromUTLabel?.[1]) ? fromUTLabel[1] : [],
  };
};

const getStateNamesFromCategoriesApi = async () => {
  const data = await fetchJson(`${apiBase}/categories/`);
  const categories = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const stateCategory = categories.find((item) =>
    STATE_CATEGORY_SLUGS.has(String(item?.slug || "").trim().toLowerCase())
  );

  if (!stateCategory) {
    return { states: [], uts: [] };
  }

  return extractListFromCategoryGroup(stateCategory?.sub_categories);
};

const toCount = (payload) => {
  if (typeof payload?.count === "number") return payload.count;
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload?.results)) return payload.results.length;
  if (Array.isArray(payload?.articles)) return payload.articles.length;
  if (payload?.results && typeof payload.results === "object") {
    return Object.values(payload.results).reduce((acc, value) => {
      if (Array.isArray(value)) return acc + value.length;
      return acc;
    }, 0);
  }
  return 0;
};

const checkOneRegion = async (name) => {
  try {
    const payload = await fetchJson(
      `${apiBase}/articles/by-state/?state=${encodeURIComponent(name)}&page=1&limit=1`
    );
    return {
      name,
      count: toCount(payload),
      ok: true,
      error: "",
    };
  } catch (error) {
    return {
      name,
      count: -1,
      ok: false,
      error: error.message,
    };
  }
};

const runWithLimit = async (items, limit, worker) => {
  const results = new Array(items.length);
  let index = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  });

  await Promise.all(runners);
  return results;
};

const formatStatus = (row) => {
  if (!row.ok) return "ERROR";
  if (row.count > 0) return "OK";
  return "EMPTY";
};

const printTable = (title, rows) => {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
  rows.forEach((row) => {
    if (onlyEmpty && row.ok && row.count > 0) return;
    const status = formatStatus(row).padEnd(6, " ");
    const count = row.ok ? String(row.count).padStart(4, " ") : "   -";
    const suffix = row.ok ? "" : ` (${row.error})`;
    console.log(`${status}  ${count}  ${row.name}${suffix}`);
  });
};

const summarize = (rows) => {
  const okWithData = rows.filter((row) => row.ok && row.count > 0).length;
  const empty = rows.filter((row) => row.ok && row.count === 0).length;
  const errors = rows.filter((row) => !row.ok).length;
  return { okWithData, empty, errors, total: rows.length };
};

async function main() {
  let apiLists = { states: [], uts: [] };
  try {
    apiLists = await getStateNamesFromCategoriesApi();
  } catch (error) {
    console.warn(`Could not read categories from API (${error.message}). Using fallback lists.`);
  }

  const states = uniqueNames([...apiLists.states, ...FALLBACK_STATES]);
  const uts = uniqueNames([...apiLists.uts, ...FALLBACK_UTS]);

  const [stateRows, utRows] = await Promise.all([
    runWithLimit(states, 6, checkOneRegion),
    runWithLimit(uts, 6, checkOneRegion),
  ]);

  const allRows = [...stateRows, ...utRows];
  const stateSummary = summarize(stateRows);
  const utSummary = summarize(utRows);
  const allSummary = summarize(allRows);

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          apiBase,
          generatedAt: new Date().toISOString(),
          summary: {
            states: stateSummary,
            unionTerritories: utSummary,
            overall: allSummary,
          },
          states: stateRows,
          unionTerritories: utRows,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`API Base: ${apiBase}`);
  printTable("States of India", stateRows);
  printTable("Union Territories", utRows);

  console.log("\nSummary");
  console.log("-------");
  console.log(
    `States: ${stateSummary.okWithData}/${stateSummary.total} with articles, ${stateSummary.empty} empty, ${stateSummary.errors} errors`
  );
  console.log(
    `UTs:    ${utSummary.okWithData}/${utSummary.total} with articles, ${utSummary.empty} empty, ${utSummary.errors} errors`
  );
  console.log(
    `Total:  ${allSummary.okWithData}/${allSummary.total} with articles, ${allSummary.empty} empty, ${allSummary.errors} errors`
  );

  const empties = allRows.filter((row) => row.ok && row.count === 0).map((row) => row.name);
  if (empties.length > 0) {
    console.log("\nNo-article regions:");
    empties.forEach((name) => console.log(`- ${name}`));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
