import test from "node:test";
import assert from "node:assert/strict";
import {
  getBatchTrends,
  getCompanyDetail,
  getFacets,
  handleApiRequest,
  listCompanies,
  searchCompanies,
} from "../src/lib/api.mjs";
import { loadCompanyStore } from "../src/lib/db.mjs";

test("company list endpoint returns paginated normalized data", async () => {
  const response = await handleApiRequest("/api/companies?limit=5");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.length, 5);
  assert.ok(response.body.pagination.total > 0);
  assert.equal(response.body.data[0].rawDirectoryRecord, undefined);
  assert.ok(response.body.meta.sourceUpdatedAt);
});

test("company list filters by a known industry", async () => {
  const store = await loadCompanyStore();
  const industry = store.companies.find((company) => company.industry)?.industry;
  const response = listCompanies(store, { industry, limit: "25" });

  assert.ok(industry);
  assert.ok(response.data.length > 0);
  assert.ok(response.data.every((company) => company.industry === industry));
});

test("company detail endpoint returns one company by slug", async () => {
  const store = await loadCompanyStore();
  const company = store.companies[0];
  const detail = getCompanyDetail(store, company.slug);

  assert.equal(detail.data.slug, company.slug);
  assert.deepEqual(detail.enrichment.founders, []);
});

test("search endpoint returns plausible scored results", async () => {
  const store = await loadCompanyStore();
  const response = searchCompanies(store, { q: "Airbnb", limit: "10" });

  assert.ok(response.data.length > 0);
  assert.equal(response.data[0].company.slug, "airbnb");
  assert.ok(response.data[0].score > 0);
});

test("facets and trends expose non-empty aggregate arrays", async () => {
  const store = await loadCompanyStore();
  const facets = getFacets(store);
  const batchTrends = getBatchTrends(store, { limit: "10" });

  assert.ok(facets.data.industries.length > 0);
  assert.ok(facets.data.tags.length > 0);
  assert.ok(facets.data.teamSizeBuckets.length > 0);
  assert.ok(batchTrends.data.length > 0);
});

test("HTTP route dispatcher supports trend and missing detail endpoints", async () => {
  const trends = await handleApiRequest("/api/trends/tags?limit=5");
  const missing = await handleApiRequest("/api/companies/not-a-real-company");
  const missingSimilar = await handleApiRequest("/api/companies/not-a-real-company/similar");

  assert.equal(trends.status, 200);
  assert.equal(trends.body.data.length, 5);
  assert.equal(missing.status, 404);
  assert.equal(missingSimilar.status, 404);
});

test("batch trends sort dated batches ahead of unknown batches", async () => {
  const store = await loadCompanyStore();
  const response = getBatchTrends(store, { limit: "5" });

  assert.ok(response.data.every((row) => row.batchYear !== null));
});
