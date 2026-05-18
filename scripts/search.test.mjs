import test from "node:test";
import assert from "node:assert/strict";
import { loadCompanyStore } from "../src/lib/db.mjs";
import {
  getSimilarCompaniesBody,
  searchCompaniesBody,
  searchScore,
} from "../src/lib/search.mjs";

test("search returns compact result fields plus match diagnostics", async () => {
  const store = await loadCompanyStore();
  const response = searchCompaniesBody(store, { q: "airbnb travel marketplace", limit: "5" });

  assert.equal(response.rankingMode, "lexical");
  assert.equal(response.data[0].slug, "airbnb");
  assert.equal(response.data[0].id, response.data[0].company.id);
  assert.ok(response.data[0].ycUrl.endsWith("/airbnb"));
  assert.ok(response.data[0].matchedFields.length > 0);
  assert.ok(response.data[0].matchedTerms.includes("airbnb"));
});

test("brand-aware search can still find canonical companies in descriptive queries", async () => {
  const store = await loadCompanyStore();
  const response = searchCompaniesBody(store, { q: "stripe payments fintech", limit: "5" });

  assert.equal(response.data[0].slug, "stripe");
  assert.ok(response.data[0].score > response.data[1].score);
});

test("companies-like query switches to similarity ranking", async () => {
  const store = await loadCompanyStore();
  const response = searchCompaniesBody(store, { q: "companies like Rippling", limit: "10" });

  assert.equal(response.rankingMode, "similar-company");
  assert.equal(response.parsedQuery.intent.sourceSlug, "rippling");
  assert.ok(response.data.length > 0);
  assert.ok(response.data.every((result) => result.slug !== "rippling"));
  assert.ok(response.data.some((result) => result.reasons.length > 0));
});

test("similar companies include reasons and matched terms", async () => {
  const store = await loadCompanyStore();
  const response = getSimilarCompaniesBody(store, "rippling", { limit: "5" });

  assert.equal(response.sourceCompany.slug, "rippling");
  assert.equal(response.data.length, 5);
  assert.ok(response.data.every((result) => result.slug !== "rippling"));
  assert.ok(response.data[0].score > 0);
  assert.ok(response.data[0].reasons.some((reason) => reason.includes("Same industry") || reason.includes("Shared tags")));
});

test("searchScore supports list filtering without exposing result envelopes", async () => {
  const store = await loadCompanyStore();
  const airbnb = store.bySlug.get("airbnb");
  const score = searchScore(airbnb, "travel marketplace");

  assert.ok(score > 0);
});
