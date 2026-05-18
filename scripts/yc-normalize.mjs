const STATUS_VALUES = new Set(["Active", "Inactive", "Acquired", "Public"]);

const SEASON_BY_PREFIX = new Map([
  ["W", "Winter"],
  ["SP", "Spring"],
  ["S", "Summer"],
  ["F", "Fall"],
]);

const SEASON_BY_NAME = new Map([
  ["winter", "Winter"],
  ["spring", "Spring"],
  ["summer", "Summer"],
  ["fall", "Fall"],
  ["autumn", "Fall"],
]);

export const YC_COMPANIES_BASE_URL = "https://www.ycombinator.com/companies";

export function normalizeCompany(raw, sourceUpdatedAt) {
  const batch = stringValue(raw.batch) ?? "";
  const parsedBatch = parseBatch(batch);

  return {
    id: numberValue(raw.id) ?? numberValue(raw.objectID) ?? 0,
    slug: stringValue(raw.slug) ?? "",
    name: stringValue(raw.name) ?? "",
    formerNames: arrayOfStrings(raw.former_names),
    oneLiner: stringValue(raw.one_liner) ?? "",
    longDescription: stringValue(raw.long_description) ?? "",
    batch,
    batchSeason: parsedBatch.batchSeason,
    batchYear: parsedBatch.batchYear,
    status: normalizeStatus(raw.status),
    teamSize: numberValue(raw.team_size),
    industry: stringValue(raw.industry),
    subindustry: stringValue(raw.subindustry),
    industries: arrayOfStrings(raw.industries),
    tags: arrayOfStrings(raw.tags),
    regions: arrayOfStrings(raw.regions),
    allLocations: stringValue(raw.all_locations),
    website: stringValue(raw.website),
    isHiring: booleanValue(raw.isHiring),
    topCompany: booleanValue(raw.top_company),
    nonprofit: booleanValue(raw.nonprofit),
    stage: stringValue(raw.stage),
    launchedAt: unixTimestampToIso(raw.launched_at),
    smallLogoUrl: stringValue(raw.small_logo_thumb_url),
    ycUrl: `${YC_COMPANIES_BASE_URL}/${stringValue(raw.slug) ?? ""}`,
    sourceUpdatedAt,
  };
}

export function parseBatch(batch) {
  const value = stringValue(batch);
  if (!value) {
    return { batchSeason: "Unknown", batchYear: null };
  }

  const named = value.match(/\b(Winter|Spring|Summer|Fall|Autumn)\b\s+(\d{4})\b/i);
  if (named) {
    return {
      batchSeason: SEASON_BY_NAME.get(named[1].toLowerCase()) ?? "Unknown",
      batchYear: Number(named[2]),
    };
  }

  const short = value.match(/\b(W|Sp|S|F)\s*'?(\d{2,4})\b/i);
  if (short) {
    const yearText = short[2];
    const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
    return {
      batchSeason: SEASON_BY_PREFIX.get(short[1].toUpperCase()) ?? "Unknown",
      batchYear: Number.isFinite(year) ? year : null,
    };
  }

  const yearOnly = value.match(/\b(19\d{2}|20\d{2})\b/);
  return {
    batchSeason: "Unknown",
    batchYear: yearOnly ? Number(yearOnly[1]) : null,
  };
}

export function unixTimestampToIso(value) {
  const timestamp = numberValue(value);
  if (timestamp === null || timestamp <= 0) {
    return null;
  }

  const milliseconds = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function validateCompanies(companies) {
  const missingIdentity = companies
    .filter((company) => !company.id || !company.slug || !company.name)
    .map((company) => ({
      id: company.id,
      slug: company.slug,
      name: company.name,
    }));

  const invalid = [];
  for (const company of companies) {
    if (!STATUS_VALUES.has(company.status) && company.status !== "Unknown") {
      invalid.push({ id: company.id, slug: company.slug, field: "status", value: company.status });
    }
    if (typeof company.sourceUpdatedAt !== "string" || Number.isNaN(Date.parse(company.sourceUpdatedAt))) {
      invalid.push({
        id: company.id,
        slug: company.slug,
        field: "sourceUpdatedAt",
        value: company.sourceUpdatedAt,
      });
    }
    for (const arrayField of ["formerNames", "industries", "tags", "regions"]) {
      if (!Array.isArray(company[arrayField])) {
        invalid.push({ id: company.id, slug: company.slug, field: arrayField, value: company[arrayField] });
      }
    }
  }

  return {
    total: companies.length,
    missingIdentity,
    invalid,
    statusCounts: countBy(companies, (company) => company.status),
    topIndustries: topCounts(companies.map((company) => company.industry).filter(Boolean), 10),
    topTags: topCounts(companies.flatMap((company) => company.tags), 10),
  };
}

export function countBy(items, getKey) {
  const counts = {};
  for (const item of items) {
    const key = getKey(item) || "Unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

export function topCounts(values, limit) {
  const counts = {};
  for (const value of values) {
    if (value) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function normalizeStatus(value) {
  const status = stringValue(value);
  return status && STATUS_VALUES.has(status) ? status : "Unknown";
}

function stringValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function booleanValue(value) {
  return value === true;
}

function arrayOfStrings(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}
