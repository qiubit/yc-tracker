import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeCompany, validateCompanies, YC_COMPANIES_BASE_URL } from "./yc-normalize.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT_DIR = resolve(ROOT, "data/yc");
const DIRECTORY_URL = YC_COMPANIES_BASE_URL;
const INDEX_NAME = "YCCompany_production";
const SOURCE_KIND = "yc-directory-index";
const MAX_ID = 1_000_000;
const ID_WINDOW_SIZE = 1000;

const options = parseArgs(process.argv.slice(2));
const outputDir = resolve(ROOT, options.outputDir ?? DEFAULT_OUTPUT_DIR);
const hitsPerPage = Number(options.hitsPerPage ?? 1000);
const maxPages = options.maxPages ? Number(options.maxPages) : null;
const useCache = Boolean(options.cache);

if (!Number.isInteger(hitsPerPage) || hitsPerPage <= 0) {
  throw new Error(`Invalid --hits-per-page value: ${options.hitsPerPage}`);
}

await mkdir(outputDir, { recursive: true });

const fetchedAt = new Date().toISOString();
const algolia = await getAlgoliaConfig(outputDir, useCache);
const sourceUrl = `https://${algolia.app}-dsn.algolia.net/1/indexes/${INDEX_NAME}/query`;
const { pages, reportedTotalHits } = await fetchAllPages({ algolia, sourceUrl, hitsPerPage, maxPages });
const rawHits = uniqueById(pages.flatMap((page) => page.hits));

const rawRecords = rawHits.map((payload) => ({
  source: SOURCE_KIND,
  sourceUrl,
  fetchedAt,
  payload,
}));

const companies = rawRecords.map((record) => normalizeCompany(record.payload, record.fetchedAt));
const validation = validateCompanies(companies);

const metadata = {
  source: SOURCE_KIND,
  directoryUrl: DIRECTORY_URL,
  sourceUrl,
  indexName: INDEX_NAME,
  fetchedAt,
  requestCount: pages.length,
  rangeCount: new Set(pages.map((page) => page.idRange.join("-"))).size,
  hitsPerPage,
  fetchedRecordCount: rawHits.length,
  normalizedRecordCount: companies.length,
  reportedTotalHits,
  statusCounts: validation.statusCounts,
  topIndustries: validation.topIndustries,
  topTags: validation.topTags,
  missingIdentity: validation.missingIdentity,
  invalid: validation.invalid,
};

await writeJson(resolve(outputDir, "raw-companies.json"), {
  metadata,
  records: rawRecords,
});
await writeJson(resolve(outputDir, "companies.json"), {
  metadata,
  companies,
});
await writeJson(resolve(outputDir, "import-metadata.json"), metadata);

printSummary(metadata);

if (validation.missingIdentity.length > 0 || validation.invalid.length > 0) {
  process.exitCode = 1;
}

async function getAlgoliaConfig(outputDirForCache, shouldUseCache) {
  const cachePath = resolve(outputDirForCache, "yc-directory-page.html");
  let html;

  if (shouldUseCache) {
    try {
      html = await readFile(cachePath, "utf8");
    } catch {
      html = null;
    }
  }

  if (!html) {
    const response = await fetchWithRetry(DIRECTORY_URL);
    html = await response.text();
    await writeFile(cachePath, html);
  }

  const match = html.match(/window\.AlgoliaOpts\s*=\s*(\{[^<]+?\});/);
  if (!match) {
    throw new Error("Could not find window.AlgoliaOpts in the YC directory page.");
  }

  const parsed = JSON.parse(match[1]);
  if (!parsed.app || !parsed.key) {
    throw new Error("YC directory Algolia config is missing app or key.");
  }

  return {
    app: parsed.app,
    key: parsed.key,
  };
}

async function fetchAllPages({ algolia, sourceUrl, hitsPerPage, maxPages }) {
  const pages = [];
  const totalProbe = await fetchQueryPage({ algolia, sourceUrl, hitsPerPage: 1, page: 0, minId: 0, maxId: MAX_ID });
  const reportedTotalHits = totalProbe.nbHits;
  const uniqueIds = new Set();

  for (let minId = 0; minId <= MAX_ID && uniqueIds.size < reportedTotalHits; minId += ID_WINDOW_SIZE) {
    if (maxPages !== null && pages.length >= maxPages) {
      break;
    }

    const maxId = Math.min(minId + ID_WINDOW_SIZE - 1, MAX_ID);
    await fetchRange({ algolia, sourceUrl, hitsPerPage, maxPages, pages, minId, maxId });

    for (const page of pages) {
      for (const hit of page.hits) {
        uniqueIds.add(hit.id ?? hit.objectID ?? `${hit.slug}:${hit.name}`);
      }
    }

    if (uniqueIds.size < reportedTotalHits) {
      await sleep(100);
    }
  }

  return { pages, reportedTotalHits };
}

async function fetchRange({ algolia, sourceUrl, hitsPerPage, maxPages, pages, minId, maxId }) {
  if (maxPages !== null && pages.length >= maxPages) {
    return;
  }

  const firstPage = await fetchQueryPage({ algolia, sourceUrl, hitsPerPage, page: 0, minId, maxId });
  pages.push(firstPage);

  if (firstPage.nbHits > firstPage.hits.length) {
    if (minId === maxId) {
      throw new Error(`Algolia returned ${firstPage.nbHits} records for single id ${minId}; cannot split further.`);
    }

    const midpoint = Math.floor((minId + maxId) / 2);
    await sleep(250);
    await fetchRange({ algolia, sourceUrl, hitsPerPage, maxPages, pages, minId, maxId: midpoint });
    await sleep(250);
    await fetchRange({ algolia, sourceUrl, hitsPerPage, maxPages, pages, minId: midpoint + 1, maxId });
    return;
  }

  let page = 1;
  while (page < firstPage.nbPages) {
    if (maxPages !== null && pages.length >= maxPages) {
      break;
    }

    await sleep(250);
    pages.push(await fetchQueryPage({ algolia, sourceUrl, hitsPerPage, page, minId, maxId }));
    page += 1;
  }
}

async function fetchQueryPage({ algolia, sourceUrl, hitsPerPage, page, minId, maxId }) {
  const body = {
    query: "",
    page,
    hitsPerPage,
    facetFilters: ["ycdc_public"],
    numericFilters: [`id>=${minId}`, `id<=${maxId}`],
    attributesToHighlight: [],
  };

  const response = await fetchWithRetry(sourceUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-algolia-application-id": algolia.app,
      "x-algolia-api-key": algolia.key,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!Array.isArray(payload.hits)) {
    throw new Error(`Algolia page ${page} for id range ${minId}-${maxId} did not return a hits array.`);
  }

  return {
    page: payload.page,
    nbPages: payload.nbPages,
    nbHits: payload.nbHits,
    idRange: [minId, maxId],
    hits: payload.hits,
  };
}

async function fetchWithRetry(url, init = {}, maxAttempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === maxAttempts) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
    }

    await sleep(500 * 2 ** (attempt - 1));
  }

  throw new Error(`Failed to fetch ${url}: ${lastError?.message ?? "unknown error"}`);
}

function uniqueById(records) {
  const seen = new Set();
  const unique = [];

  for (const record of records) {
    const key = record.id ?? record.objectID ?? `${record.slug}:${record.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(record);
    }
  }

  return unique;
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function printSummary(metadata) {
  console.log(`Fetched companies: ${metadata.fetchedRecordCount}`);
  console.log(`Normalized companies: ${metadata.normalizedRecordCount}`);
  console.log(`Requests made: ${metadata.requestCount}`);
  console.log(`ID ranges fetched: ${metadata.rangeCount}`);
  console.log(`Source URL: ${metadata.sourceUrl}`);
  console.log(`Fetched at: ${metadata.fetchedAt}`);
  console.log("Counts by status:");
  for (const [status, count] of Object.entries(metadata.statusCounts)) {
    console.log(`  ${status}: ${count}`);
  }
  console.log("Top 10 industries:");
  for (const item of metadata.topIndustries) {
    console.log(`  ${item.value}: ${item.count}`);
  }
  console.log("Top 10 tags:");
  for (const item of metadata.topTags) {
    console.log(`  ${item.value}: ${item.count}`);
  }
  console.log(`Missing id/slug/name: ${metadata.missingIdentity.length}`);
  console.log(`Invalid normalized fields: ${metadata.invalid.length}`);
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--cache") {
      parsed.cache = true;
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2).replaceAll("-", "");
      parsed[key] = args[index + 1];
      index += 1;
    }
  }
  return {
    outputDir: parsed.outputdir,
    hitsPerPage: parsed.hitsperpage,
    maxPages: parsed.maxpages,
    cache: parsed.cache,
  };
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}
