import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getBatchTrends,
  getCompanyDetail,
  getFacets,
  getIndustryTrends,
  getTagTrends,
  listCompanies,
  searchCompanies,
  teamSizeBucket,
} from "../src/lib/api.mjs";
import { loadCompanyStore } from "../src/lib/db.mjs";

const COMPANY_STATUSES = new Set(["Active", "Inactive", "Acquired", "Public", "Unknown"]);
const BATCH_SEASONS = new Set(["Winter", "Spring", "Summer", "Fall", "Unknown"]);

test("QA smoke: normalized dataset satisfies shared schema invariants", async () => {
  const payload = JSON.parse(await readFile(resolve("data/yc/companies.json"), "utf8"));
  const companies = Array.isArray(payload) ? payload : payload.companies;

  assert.ok(Array.isArray(companies), "companies payload should be an array or contain companies array");
  assert.ok(companies.length >= 5800 && companies.length <= 6500, `unexpected company count: ${companies.length}`);

  const ids = new Set();
  const slugs = new Set();
  for (const company of companies) {
    assert.equal(typeof company.id, "number", `${company.slug} should have numeric id`);
    assert.ok(company.id > 0, `${company.slug} should have positive id`);
    assert.equal(typeof company.slug, "string", `company ${company.id} should have slug`);
    assert.ok(company.slug.length > 0, `company ${company.id} should have non-empty slug`);
    assert.equal(typeof company.name, "string", `${company.slug} should have name`);
    assert.ok(company.name.length > 0, `${company.slug} should have non-empty name`);

    assert.ok(!ids.has(company.id), `duplicate company id: ${company.id}`);
    assert.ok(!slugs.has(company.slug), `duplicate company slug: ${company.slug}`);
    ids.add(company.id);
    slugs.add(company.slug);

    assert.ok(COMPANY_STATUSES.has(company.status), `${company.slug} has invalid status ${company.status}`);
    assert.ok(BATCH_SEASONS.has(company.batchSeason), `${company.slug} has invalid batch season ${company.batchSeason}`);
    assert.ok(company.batchYear === null || Number.isInteger(company.batchYear), `${company.slug} has invalid batch year`);
    assert.ok(company.launchedAt === null || !Number.isNaN(Date.parse(company.launchedAt)), `${company.slug} has invalid launchedAt`);

    assert.ok(Array.isArray(company.formerNames), `${company.slug} formerNames should be an array`);
    assert.ok(Array.isArray(company.industries), `${company.slug} industries should be an array`);
    assert.ok(Array.isArray(company.tags), `${company.slug} tags should be an array`);
    assert.ok(Array.isArray(company.regions), `${company.slug} regions should be an array`);
    assert.equal(typeof company.ycUrl, "string", `${company.slug} should have YC URL`);
    assert.equal(typeof company.sourceUpdatedAt, "string", `${company.slug} should have source timestamp`);
    assert.ok(!Number.isNaN(Date.parse(company.sourceUpdatedAt)), `${company.slug} source timestamp should parse`);
  }

  const bySlug = new Map(companies.map((company) => [company.slug, company]));
  assert.deepEqual(
    pickBatch(bySlug.get("airbnb")),
    { batch: "Winter 2009", batchSeason: "Winter", batchYear: 2009 },
  );
  assert.deepEqual(
    pickBatch(bySlug.get("stripe")),
    { batch: "Summer 2009", batchSeason: "Summer", batchYear: 2009 },
  );
});

test("QA smoke: combined filters narrow results and preserve result counts", async () => {
  const store = await loadCompanyStore();
  const seed = store.companies.find((company) =>
    company.industry &&
    company.status === "Active" &&
    company.tags.length > 0 &&
    typeof company.isHiring === "boolean" &&
    teamSizeBucket(company.teamSize) !== "unknown"
  );

  assert.ok(seed, "expected at least one company with enough fields for combined filter smoke");

  const response = listCompanies(store, {
    industry: seed.industry,
    status: seed.status,
    tag: seed.tags[0],
    isHiring: String(seed.isHiring),
    teamSizeBucket: teamSizeBucket(seed.teamSize),
    limit: "25",
  });

  assert.ok(response.pagination.total > 0);
  assert.ok(response.data.length > 0);
  assert.ok(response.data.length <= 25);
  assert.ok(response.data.every((company) => company.industry === seed.industry));
  assert.ok(response.data.every((company) => company.status === seed.status));
  assert.ok(response.data.every((company) => company.tags.includes(seed.tags[0])));
  assert.ok(response.data.every((company) => company.isHiring === seed.isHiring));
  assert.ok(response.data.every((company) => teamSizeBucket(company.teamSize) === teamSizeBucket(seed.teamSize)));
});

test("QA smoke: known-company search, detail, facets, and trends are usable", async () => {
  const store = await loadCompanyStore();

  const search = searchCompanies(store, { q: "stripe payments fintech", limit: "5" });
  assert.equal(search.rankingMode, "lexical");
  assert.equal(search.data[0].company.slug, "stripe");
  assert.ok(search.data[0].score > 0);

  const detail = getCompanyDetail(store, "airbnb");
  assert.equal(detail.data.slug, "airbnb");
  assert.ok(detail.data.ycUrl.endsWith("/airbnb"));
  assert.ok(detail.data.website === null || /^https?:\/\//.test(detail.data.website));
  assert.deepEqual(Object.keys(detail.enrichment).sort(), ["founders", "jobs", "launchPosts", "news"]);

  const empty = listCompanies(store, { q: "zzzzqqqqxxxx", limit: "10" });
  assert.equal(empty.pagination.total, 0);
  assert.equal(empty.data.length, 0);

  const facets = getFacets(store);
  assert.ok(facets.data.industries.length > 0);
  assert.ok(facets.data.statuses.length > 0);
  assert.ok(facets.data.tags.length > 0);
  assert.equal(facets.data.hiring.total, store.companies.length);

  assert.ok(getBatchTrends(store, { limit: "10" }).data.length > 0);
  assert.ok(getIndustryTrends(store, { limit: "10" }).data.length > 0);
  assert.ok(getTagTrends(store, { limit: "10" }).data.length > 0);
});

function pickBatch(company) {
  assert.ok(company, "expected company to exist");
  return {
    batch: company.batch,
    batchSeason: company.batchSeason,
    batchYear: company.batchYear,
  };
}
