const DEFAULT_SEARCH_LIMIT = 20;
const DEFAULT_SIMILAR_LIMIT = 10;
const MAX_LIMIT = 100;

const FIELD_CONFIG = [
  { key: "name", label: "Name", weight: 18, getValue: (company) => company.name },
  { key: "formerNames", label: "Former names", weight: 12, getValue: (company) => company.formerNames?.join(" ") },
  { key: "slug", label: "Slug", weight: 10, getValue: (company) => company.slug },
  { key: "oneLiner", label: "One-liner", weight: 7, getValue: (company) => company.oneLiner },
  { key: "tags", label: "Tags", weight: 7, getValue: (company) => company.tags?.join(" ") },
  { key: "industry", label: "Industry", weight: 5, getValue: (company) => company.industry },
  { key: "subindustry", label: "Subindustry", weight: 5, getValue: (company) => company.subindustry },
  { key: "industries", label: "Industries", weight: 4, getValue: (company) => company.industries?.join(" ") },
  { key: "batch", label: "Batch", weight: 3, getValue: (company) => company.batch },
  { key: "regions", label: "Regions", weight: 2, getValue: (company) => company.regions?.join(" ") },
  { key: "allLocations", label: "Locations", weight: 2, getValue: (company) => company.allLocations },
  { key: "longDescription", label: "Description", weight: 2, getValue: (company) => company.longDescription },
];

const SIMILARITY_TEXT_FIELDS = [
  { weight: 4, getValue: (company) => company.oneLiner },
  { weight: 3, getValue: (company) => company.tags?.join(" ") },
  { weight: 2, getValue: (company) => company.longDescription },
  { weight: 2, getValue: (company) => company.industry },
  { weight: 2, getValue: (company) => company.subindustry },
  { weight: 1, getValue: (company) => company.industries?.join(" ") },
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "by",
  "company",
  "companies",
  "for",
  "from",
  "in",
  "into",
  "is",
  "like",
  "of",
  "on",
  "or",
  "startup",
  "startups",
  "the",
  "to",
  "with",
]);

const KEEP_SHORT_TOKENS = new Set(["ai", "ar", "hr", "ml", "vr"]);
const TOKEN_SYNONYMS = new Map([
  ["ai", ["artificial", "intelligence", "artificial intelligence"]],
  ["artificial", ["ai"]],
  ["intelligence", ["ai"]],
  ["dev", ["developer"]],
  ["developer", ["dev", "developers"]],
  ["developers", ["developer"]],
  ["payment", ["payments", "fintech"]],
  ["payments", ["payment", "fintech"]],
  ["crypto", ["blockchain", "web3"]],
  ["blockchain", ["crypto", "web3"]],
  ["healthcare", ["health", "medical"]],
  ["health", ["healthcare", "medical"]],
  ["observability", ["monitoring"]],
  ["monitoring", ["observability"]],
]);

export function searchCompaniesBody(store, params = {}) {
  const q = stringParam(params.q);
  const limit = parseLimit(params.limit, DEFAULT_SEARCH_LIMIT);
  const offset = parseOffset(params.offset);

  if (!q) {
    return {
      data: [],
      pagination: pagination(0, limit, offset),
      query: "",
      rankingMode: "lexical",
    };
  }

  const ranked = rankSearchResults(store, q);
  const data = ranked.entries.slice(offset, offset + limit).map(formatSearchResult);

  return {
    data,
    pagination: pagination(ranked.entries.length, limit, offset),
    query: q,
    rankingMode: ranked.intent.type === "similar-company" ? "similar-company" : "lexical",
    parsedQuery: {
      terms: ranked.plan.terms,
      phrases: ranked.plan.phrases,
      inferredBatch: ranked.plan.batchPhrase,
      intent: ranked.intent,
    },
  };
}

export function getSimilarCompaniesBody(store, slug, params = {}) {
  const company = store.bySlug.get(slug);
  const limit = parseLimit(params.limit, DEFAULT_SIMILAR_LIMIT);
  const offset = parseOffset(params.offset);

  if (!company) {
    return null;
  }

  const entries = rankSimilarCompanies(store.companies, company);

  return {
    data: entries.slice(offset, offset + limit).map(formatSimilarResult),
    pagination: pagination(entries.length, limit, offset),
    sourceCompany: company,
    rankingMode: "lexical-similarity",
  };
}

export function searchScore(company, query) {
  const plan = buildQueryPlan(query);
  return scoreCompany(company, plan).score;
}

export function rankSearchResults(store, query) {
  const intent = detectSearchIntent(store, query);
  if (intent.type === "similar-company") {
    const sourceCompany = intent.company;
    const entries = rankSimilarCompanies(store.companies, sourceCompany).map((entry) => ({
      ...entry,
      score: round(entry.score + scoreCompany(entry.company, buildQueryPlan(query)).score * 0.15),
      sourceCompany,
      intent,
    }));
    return { entries, plan: buildQueryPlan(query), intent };
  }

  const plan = buildQueryPlan(query);
  const entries = store.companies
    .map((company) => ({ company, ...scoreCompany(company, plan), intent }))
    .filter((entry) => entry.score > 0)
    .sort(compareScoredCompanies);

  return { entries, plan, intent };
}

export function rankSimilarCompanies(companies, sourceCompany) {
  const sourceVector = buildSimilarityVector(sourceCompany);
  return companies
    .filter((candidate) => candidate.slug !== sourceCompany.slug)
    .map((candidate) => {
      const candidateVector = buildSimilarityVector(candidate);
      const textOverlap = scoreVectorOverlap(sourceVector, candidateVector);
      const metadata = scoreMetadataSimilarity(sourceCompany, candidate);
      const score = round(textOverlap.score + metadata.score);
      return {
        company: candidate,
        score,
        matchedTerms: textOverlap.terms.slice(0, 12),
        reasons: [...metadata.reasons, ...textOverlap.terms.slice(0, 5).map((term) => `Shared term: ${term}`)],
      };
    })
    .filter((entry) => entry.score > 0)
    .sort(compareScoredCompanies);
}

export function buildQueryPlan(query) {
  const normalized = normalizeText(query);
  const batchPhrase = detectBatchPhrase(query);
  const rawTerms = tokenize(query);
  const expanded = new Map();

  for (const term of rawTerms) {
    addWeightedTerm(expanded, term, 1);
    for (const synonym of TOKEN_SYNONYMS.get(term) ?? []) {
      if (synonym.includes(" ")) {
        continue;
      }
      addWeightedTerm(expanded, synonym, 0.7);
    }
  }

  const phrases = [normalized, batchPhrase, ...rawTerms.flatMap((term) => TOKEN_SYNONYMS.get(term) ?? []).filter((item) => item.includes(" "))]
    .filter(Boolean)
    .filter((phrase, index, all) => all.indexOf(phrase) === index);

  return {
    raw: stringParam(query),
    normalized,
    terms: [...expanded.keys()],
    weightedTerms: expanded,
    phrases,
    batchPhrase,
  };
}

function scoreCompany(company, plan) {
  if (!plan.normalized && plan.terms.length === 0) {
    return { score: 0, matchedFields: [], matchedTerms: [] };
  }

  let score = 0;
  const matchedFields = [];
  const matchedTerms = new Set();

  for (const field of FIELD_CONFIG) {
    const rawValue = field.getValue(company);
    const normalized = normalizeText(rawValue);
    if (!normalized) {
      continue;
    }

    const tokens = new Set(tokenize(rawValue));
    const fieldMatchedTerms = new Set();
    let fieldScore = 0;

    for (const phrase of plan.phrases) {
      if (phrase.length >= 3 && normalized.includes(phrase)) {
        const phraseScore = field.weight * (phrase === plan.normalized ? 3 : 2);
        fieldScore += phraseScore;
      }
    }

    for (const [term, queryWeight] of plan.weightedTerms.entries()) {
      if (tokens.has(term)) {
        const exactTokenMultiplier = field.key === "name" || field.key === "slug" ? 3 : 1;
        fieldScore += field.weight * queryWeight * exactTokenMultiplier;
        if ((field.key === "name" || field.key === "slug") && normalized === term) {
          fieldScore += field.weight * queryWeight * 4;
        }
        fieldMatchedTerms.add(term);
        matchedTerms.add(term);
        continue;
      }

      if (term.length >= 4 && hasPrefixMatch(tokens, term)) {
        fieldScore += field.weight * queryWeight * 0.45;
        fieldMatchedTerms.add(term);
        matchedTerms.add(term);
      }
    }

    if (field.key === "batch" && plan.batchPhrase && normalized === plan.batchPhrase) {
      fieldScore += field.weight * 4;
    }

    if (fieldScore > 0) {
      score += fieldScore;
      matchedFields.push({
        field: field.key,
        label: field.label,
        score: round(fieldScore),
        matchedTerms: [...fieldMatchedTerms],
      });
    }
  }

  if (company.topCompany && score > 0) {
    score += 1;
  }

  return {
    score: round(score),
    matchedFields: matchedFields.sort((a, b) => b.score - a.score || a.field.localeCompare(b.field)),
    matchedTerms: [...matchedTerms].sort(),
  };
}

function detectSearchIntent(store, query) {
  const match = normalizeText(query).match(/\b(?:companies?|startups?)\s+like\s+(.+)$/u);
  if (!match) {
    return { type: "lexical" };
  }

  const target = match[1]?.trim();
  const company = findCompanyByNameOrSlug(store, target);
  return company ? { type: "similar-company", sourceSlug: company.slug, company } : { type: "lexical" };
}

function findCompanyByNameOrSlug(store, target) {
  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) {
    return null;
  }

  const slug = normalizedTarget.replaceAll(" ", "-");
  const bySlug = store.bySlug.get(slug);
  if (bySlug) {
    return bySlug;
  }

  return (
    store.companies.find((company) => normalizeText(company.name) === normalizedTarget) ??
    store.companies.find((company) => normalizeText(company.slug) === normalizedTarget) ??
    null
  );
}

function buildSimilarityVector(company) {
  const vector = new Map();
  for (const field of SIMILARITY_TEXT_FIELDS) {
    for (const token of tokenize(field.getValue(company))) {
      addWeightedTerm(vector, token, field.weight);
    }
  }
  return vector;
}

function scoreVectorOverlap(sourceVector, candidateVector) {
  let score = 0;
  const terms = [];
  for (const [term, sourceWeight] of sourceVector.entries()) {
    const candidateWeight = candidateVector.get(term) ?? 0;
    if (candidateWeight <= 0) {
      continue;
    }
    score += Math.min(sourceWeight, candidateWeight);
    terms.push({ term, score: Math.min(sourceWeight, candidateWeight) });
  }

  return {
    score,
    terms: terms
      .sort((a, b) => b.score - a.score || a.term.localeCompare(b.term))
      .map((entry) => entry.term),
  };
}

function scoreMetadataSimilarity(source, candidate) {
  let score = 0;
  const reasons = [];

  if (source.industry && source.industry === candidate.industry) {
    score += 18;
    reasons.push(`Same industry: ${source.industry}`);
  }
  if (source.subindustry && source.subindustry === candidate.subindustry) {
    score += 8;
    reasons.push(`Same subindustry: ${source.subindustry}`);
  }
  if (source.batch && source.batch === candidate.batch) {
    score += 2;
    reasons.push(`Same batch: ${source.batch}`);
  }

  const sharedTags = intersect(source.tags, candidate.tags);
  if (sharedTags.length > 0) {
    score += sharedTags.length * 8;
    reasons.push(`Shared tags: ${sharedTags.slice(0, 5).join(", ")}`);
  }

  const sharedIndustries = intersect(source.industries, candidate.industries);
  if (sharedIndustries.length > 0) {
    score += sharedIndustries.length * 4;
  }

  const sharedRegions = intersect(source.regions, candidate.regions);
  if (sharedRegions.length > 0) {
    score += sharedRegions.length;
  }

  return { score, reasons };
}

function formatSearchResult(entry) {
  return {
    id: entry.company.id,
    slug: entry.company.slug,
    name: entry.company.name,
    oneLiner: entry.company.oneLiner,
    tags: entry.company.tags,
    industry: entry.company.industry,
    subindustry: entry.company.subindustry,
    batch: entry.company.batch,
    status: entry.company.status,
    ycUrl: entry.company.ycUrl,
    company: entry.company,
    score: entry.score,
    matchedFields: entry.matchedFields ?? [],
    matchedTerms: entry.matchedTerms ?? [],
    reasons: entry.reasons ?? [],
  };
}

function formatSimilarResult(entry) {
  return {
    id: entry.company.id,
    slug: entry.company.slug,
    name: entry.company.name,
    oneLiner: entry.company.oneLiner,
    tags: entry.company.tags,
    industry: entry.company.industry,
    subindustry: entry.company.subindustry,
    batch: entry.company.batch,
    status: entry.company.status,
    ycUrl: entry.company.ycUrl,
    company: entry.company,
    score: entry.score,
    matchedTerms: entry.matchedTerms,
    reasons: entry.reasons,
  };
}

function detectBatchPhrase(query) {
  const normalized = normalizeText(query);
  const seasonMatch = normalized.match(/\b(winter|spring|summer|fall)\s+(20\d{2})\b/u);
  if (seasonMatch) {
    return `${seasonMatch[1]} ${seasonMatch[2]}`;
  }

  const compactMatch = normalized.match(/\b([wsf])\s?(\d{2})\b/u);
  if (!compactMatch) {
    return "";
  }

  const season = { w: "winter", s: "summer", f: "fall" }[compactMatch[1]];
  const year = Number.parseInt(compactMatch[2], 10);
  return `${season} ${year >= 70 ? 1900 + year : 2000 + year}`;
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .filter((token) => !STOP_WORDS.has(token))
    .filter((token) => token.length > 2 || KEEP_SHORT_TOKENS.has(token));
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/&/gu, " and ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function hasPrefixMatch(tokens, term) {
  for (const token of tokens) {
    if (token.startsWith(term) || term.startsWith(token)) {
      return true;
    }
  }
  return false;
}

function addWeightedTerm(map, term, weight) {
  if (!term || STOP_WORDS.has(term)) {
    return;
  }
  map.set(term, (map.get(term) ?? 0) + weight);
}

function compareScoredCompanies(a, b) {
  return b.score - a.score || a.company.name.localeCompare(b.company.name);
}

function intersect(left = [], right = []) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => rightSet.has(value));
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

function round(value) {
  return Math.round(value * 100) / 100;
}
