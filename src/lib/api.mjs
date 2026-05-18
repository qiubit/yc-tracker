import { createServer } from "node:http";
import { loadCompanyStore } from "./db.mjs";
import {
  getSimilarCompaniesBody,
  searchCompaniesBody,
  searchScore,
} from "./search.mjs";

export const TEAM_SIZE_BUCKETS = [
  { value: "1", label: "1", min: 1, max: 1 },
  { value: "2-10", label: "2-10", min: 2, max: 10 },
  { value: "11-50", label: "11-50", min: 11, max: 50 },
  { value: "51-200", label: "51-200", min: 51, max: 200 },
  { value: "201-1000", label: "201-1000", min: 201, max: 1000 },
  { value: "1001+", label: "1001+", min: 1001, max: Number.POSITIVE_INFINITY },
  { value: "unknown", label: "Unknown", min: null, max: null },
];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const SORTS = new Set([
  "relevance",
  "name",
  "-name",
  "batch",
  "-batch",
  "batchYear",
  "-batchYear",
  "teamSize",
  "-teamSize",
  "launchedAt",
  "-launchedAt",
  "sourceUpdatedAt",
  "-sourceUpdatedAt",
]);

export async function handleApiRequest(inputUrl, options = {}) {
  const store = options.store ?? (await loadCompanyStore(options));
  const url = new URL(inputUrl, "http://localhost");
  return routeApiRequest(store, url);
}

export function routeApiRequest(store, url) {
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.pathname === "/api/companies") {
    return ok(listCompanies(store, paramsFromSearch(url.searchParams)));
  }

  if (parts[0] === "api" && parts[1] === "companies" && parts[2] && parts[3] === "similar") {
    const similar = getSimilarCompanies(store, decodeURIComponent(parts[2]), paramsFromSearch(url.searchParams));
    return similar ? ok(similar) : notFound("Company not found");
  }

  if (parts[0] === "api" && parts[1] === "companies" && parts[2] && parts.length === 3) {
    const detail = getCompanyDetail(store, decodeURIComponent(parts[2]));
    return detail ? ok(detail) : notFound("Company not found");
  }

  if (url.pathname === "/api/facets") {
    return ok(getFacets(store));
  }

  if (url.pathname === "/api/search") {
    return ok(searchCompanies(store, paramsFromSearch(url.searchParams)));
  }

  if (parts[0] === "api" && parts[1] === "trends" && parts[2]) {
    return trendResponse(store, parts[2], paramsFromSearch(url.searchParams));
  }

  return notFound("Endpoint not found");
}

export function createApiServer(options = {}) {
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET") {
        writeJson(response, 405, { error: { message: "Method not allowed" } });
        return;
      }

      const result = await handleApiRequest(request.url ?? "/", options);
      writeJson(response, result.status, result.body);
    } catch (error) {
      writeJson(response, 500, {
        error: {
          message: "Internal server error",
          detail: process.env.NODE_ENV === "production" ? undefined : error.message,
        },
      });
    }
  });

  return server;
}

export function listCompanies(store, params = {}) {
  const filters = parseFilters(params);
  const limit = parseLimit(params.limit, DEFAULT_LIMIT);
  const offset = parseOffset(params.offset);
  const sort = parseSort(params.sort);

  const filtered = applyCompanyFilters(store.companies, filters);
  const sorted = sort === "relevance" && filters.q
    ? sortCompaniesByRelevance(filtered, filters.q)
    : sortCompanies(filtered, sort);
  const data = sorted.slice(offset, offset + limit);

  return withMeta(store, {
    data,
    pagination: pagination(filtered.length, limit, offset),
    filters,
    sort,
  });
}

export function getCompanyDetail(store, slug) {
  const company = store.bySlug.get(slug);
  if (!company) {
    return null;
  }

  return withMeta(store, {
    data: company,
    enrichment: {
      founders: [],
      jobs: [],
      news: [],
      launchPosts: [],
    },
  });
}

export function getFacets(store) {
  const companies = store.companies;
  const hiring = {
    hiring: companies.filter((company) => company.isHiring).length,
    notHiring: companies.filter((company) => !company.isHiring).length,
    total: companies.length,
  };

  return withMeta(store, {
    data: {
      batches: countField(companies, (company) => company.batch),
      industries: countField(companies, (company) => company.industry),
      statuses: countField(companies, (company) => company.status),
      regions: countField(companies, (company) => company.regions),
      tags: countField(companies, (company) => company.tags),
      teamSizeBuckets: TEAM_SIZE_BUCKETS.map((bucket) => ({
        value: bucket.value,
        label: bucket.label,
        count: companies.filter((company) => teamSizeBucket(company.teamSize) === bucket.value).length,
      })),
      hiring,
    },
  });
}

export function searchCompanies(store, params = {}) {
  return withMeta(store, searchCompaniesBody(store, params));
}

export function getSimilarCompanies(store, slug, params = {}) {
  const body = getSimilarCompaniesBody(store, slug, params);
  return body ? withMeta(store, body) : null;
}

export function getBatchTrends(store, params = {}) {
  const groups = groupBy(store.companies, (company) => company.batch || "Unknown");
  const rows = [...groups.entries()].map(([batch, companies]) => {
    const batchYear = firstDefined(companies.map((company) => company.batchYear));
    const batchSeason = firstDefined(companies.map((company) => company.batchSeason)) ?? "Unknown";
    const teamSizes = companies
      .map((company) => company.teamSize)
      .filter((value) => typeof value === "number" && value > 0);
    return {
      batch,
      batchSeason,
      batchYear,
      count: companies.length,
      activeCount: companies.filter((company) => company.status === "Active").length,
      hiringCount: companies.filter((company) => company.isHiring).length,
      averageTeamSize: teamSizes.length ? round(teamSizes.reduce((sum, value) => sum + value, 0) / teamSizes.length) : null,
      sourceUpdatedAt: latestString(companies.map((company) => company.sourceUpdatedAt)),
    };
  });

  return trendEnvelope(store, rows.sort(compareBatchTrend), params);
}

export function getTagTrends(store, params = {}) {
  return trendEnvelope(
    store,
    countField(store.companies, (company) => company.tags).map(({ value, count }) => ({
      tag: value,
      count,
      hiringCount: store.companies.filter((company) => company.tags.includes(value) && company.isHiring).length,
    })),
    params,
  );
}

export function getIndustryTrends(store, params = {}) {
  const rows = countField(store.companies, (company) => company.industry).map(({ value, count }) => {
    const companies = store.companies.filter((company) => company.industry === value);
    return {
      industry: value,
      count,
      activeCount: companies.filter((company) => company.status === "Active").length,
      hiringCount: companies.filter((company) => company.isHiring).length,
    };
  });
  return trendEnvelope(store, rows, params);
}

export function getCooccurrenceTrends(store, params = {}) {
  const counts = new Map();
  for (const company of store.companies) {
    const tags = [...new Set(company.tags)].sort((a, b) => a.localeCompare(b));
    for (let index = 0; index < tags.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < tags.length; otherIndex += 1) {
        const key = `${tags[index]}\u0000${tags[otherIndex]}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  const rows = [...counts.entries()]
    .map(([key, count]) => {
      const [source, target] = key.split("\u0000");
      return { source, target, count };
    })
    .filter((row) => row.count > 1)
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source) || a.target.localeCompare(b.target));

  return trendEnvelope(store, rows, params);
}

export function applyCompanyFilters(companies, filters) {
  return companies.filter((company) => {
    if (filters.q && searchScore(company, filters.q) <= 0) {
      return false;
    }
    if (filters.batch.length > 0 && !matchesOne(company.batch, filters.batch)) {
      return false;
    }
    if (filters.industry.length > 0 && !matchesOne(company.industry, filters.industry)) {
      return false;
    }
    if (filters.status.length > 0 && !matchesOne(company.status, filters.status)) {
      return false;
    }
    if (filters.region.length > 0 && !matchesAny(company.regions, filters.region)) {
      return false;
    }
    if (filters.tag.length > 0 && !matchesAny(company.tags, filters.tag)) {
      return false;
    }
    if (filters.isHiring !== null && company.isHiring !== filters.isHiring) {
      return false;
    }
    if (filters.topCompany !== null && company.topCompany !== filters.topCompany) {
      return false;
    }
    if (filters.teamSizeBucket.length > 0 && !filters.teamSizeBucket.includes(teamSizeBucket(company.teamSize))) {
      return false;
    }
    return true;
  });
}

export function parseFilters(params = {}) {
  return {
    q: stringParam(params.q),
    batch: listParam(params.batch),
    industry: listParam(params.industry),
    status: listParam(params.status),
    region: listParam(params.region),
    tag: listParam(params.tag),
    isHiring: booleanParam(params.isHiring),
    topCompany: booleanParam(params.topCompany),
    teamSizeBucket: listParam(params.teamSizeBucket),
  };
}

export function teamSizeBucket(teamSize) {
  if (typeof teamSize !== "number" || !Number.isFinite(teamSize) || teamSize <= 0) {
    return "unknown";
  }
  return TEAM_SIZE_BUCKETS.find((bucket) => bucket.min !== null && teamSize >= bucket.min && teamSize <= bucket.max)?.value ?? "unknown";
}

function trendResponse(store, trendName, params) {
  if (trendName === "batches") {
    return ok(getBatchTrends(store, params));
  }
  if (trendName === "tags") {
    return ok(getTagTrends(store, params));
  }
  if (trendName === "industries") {
    return ok(getIndustryTrends(store, params));
  }
  if (trendName === "cooccurrence") {
    return ok(getCooccurrenceTrends(store, params));
  }
  return notFound("Trend endpoint not found");
}

function trendEnvelope(store, rows, params) {
  const limit = parseLimit(params.limit, 50);
  const offset = parseOffset(params.offset);
  return withMeta(store, {
    data: rows.slice(offset, offset + limit),
    pagination: pagination(rows.length, limit, offset),
  });
}

function sortCompanies(companies, sort) {
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  const multiplier = desc ? -1 : 1;
  return [...companies].sort((a, b) => {
    const compared = compareValues(a[field], b[field]);
    return compared === 0 ? a.name.localeCompare(b.name) : compared * multiplier;
  });
}

function sortCompaniesByRelevance(companies, query) {
  return [...companies].sort((a, b) => {
    const compared = searchScore(b, query) - searchScore(a, query);
    return compared === 0 ? a.name.localeCompare(b.name) : compared;
  });
}

function compareValues(a, b) {
  if (a === null || a === undefined) {
    return b === null || b === undefined ? 0 : 1;
  }
  if (b === null || b === undefined) {
    return -1;
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return String(a).localeCompare(String(b));
}

function countField(companies, getValue) {
  const counts = new Map();
  for (const company of companies) {
    const value = getValue(company);
    const values = Array.isArray(value) ? value : [value ?? "Unknown"];
    for (const item of values) {
      const key = item || "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function parseSort(value) {
  const sort = stringParam(value) || "name";
  return SORTS.has(sort) ? sort : "name";
}

function parseLimit(value, fallback) {
  const limit = Number.parseInt(stringParam(value) ?? "", 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    return fallback;
  }
  return Math.min(limit, MAX_LIMIT);
}

function parseOffset(value) {
  const offset = Number.parseInt(stringParam(value) ?? "", 10);
  return Number.isFinite(offset) && offset > 0 ? offset : 0;
}

function pagination(total, limit, offset) {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

function withMeta(store, body) {
  return {
    ...body,
    meta: {
      totalCompanies: store.companies.length,
      sourceUpdatedAt: store.sourceUpdatedAt,
      loadedAt: store.loadedAt,
    },
  };
}

function ok(body) {
  return { status: 200, body };
}

function notFound(message) {
  return { status: 404, body: { error: { message } } };
}

function writeJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  response.end(JSON.stringify(body));
}

function paramsFromSearch(searchParams) {
  const params = {};
  for (const [key, value] of searchParams.entries()) {
    if (params[key] === undefined) {
      params[key] = value;
    } else if (Array.isArray(params[key])) {
      params[key].push(value);
    } else {
      params[key] = [params[key], value];
    }
  }
  return params;
}

function listParam(value) {
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .filter((item) => item !== undefined && item !== null)
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringParam(value) {
  if (Array.isArray(value)) {
    return stringParam(value[0]);
  }
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return "";
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : "";
}

function booleanParam(value) {
  const text = normalize(stringParam(value));
  if (["true", "1", "yes"].includes(text)) {
    return true;
  }
  if (["false", "0", "no"].includes(text)) {
    return false;
  }
  return null;
}

function matchesOne(value, accepted) {
  const normalized = normalize(value);
  return accepted.some((item) => normalize(item) === normalized);
}

function matchesAny(values, accepted) {
  const normalizedValues = new Set(values.map((value) => normalize(value)));
  return accepted.some((item) => normalizedValues.has(normalize(item)));
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function firstDefined(values) {
  return values.find((value) => value !== null && value !== undefined);
}

function latestString(values) {
  return values.filter(Boolean).sort().at(-1) ?? null;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function compareBatchTrend(a, b) {
  const aYear = a.batchYear ?? Number.NEGATIVE_INFINITY;
  const bYear = b.batchYear ?? Number.NEGATIVE_INFINITY;
  const yearCompare = bYear - aYear;
  if (yearCompare !== 0) {
    return yearCompare;
  }
  const seasonOrder = { Winter: 1, Spring: 2, Summer: 3, Fall: 4, Unknown: 0 };
  return (seasonOrder[b.batchSeason] ?? 0) - (seasonOrder[a.batchSeason] ?? 0);
}
