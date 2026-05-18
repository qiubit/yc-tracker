import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const DEFAULT_COMPANIES_PATH = "data/yc/companies.json";
export const DEFAULT_IMPORT_METADATA_PATH = "data/yc/import-metadata.json";

const storeCache = new Map();

export async function loadCompanyStore(options = {}) {
  const companiesPath = resolve(process.cwd(), options.companiesPath ?? DEFAULT_COMPANIES_PATH);
  const metadataPath = resolve(process.cwd(), options.metadataPath ?? DEFAULT_IMPORT_METADATA_PATH);
  const cacheKey = `${companiesPath}\n${metadataPath}`;

  if (!options.forceReload && storeCache.has(cacheKey)) {
    return storeCache.get(cacheKey);
  }

  const payload = JSON.parse(await readFile(companiesPath, "utf8"));
  const companies = Array.isArray(payload) ? payload : payload.companies;
  if (!Array.isArray(companies)) {
    throw new Error(`Could not find companies array in ${companiesPath}`);
  }

  const importMetadata = await readOptionalJson(metadataPath);
  const metadata = payload.metadata ?? importMetadata ?? {};
  const bySlug = new Map(companies.map((company) => [company.slug, company]));
  const sourceUpdatedAt = latestIso(companies.map((company) => company.sourceUpdatedAt));

  const store = {
    companies,
    bySlug,
    metadata,
    paths: { companiesPath, metadataPath },
    sourceUpdatedAt,
    loadedAt: new Date().toISOString(),
  };

  storeCache.set(cacheKey, store);
  return store;
}

export async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export function latestIso(values) {
  let latest = null;
  for (const value of values) {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      continue;
    }
    if (latest === null || timestamp > latest.timestamp) {
      latest = { timestamp, value };
    }
  }
  return latest?.value ?? null;
}
