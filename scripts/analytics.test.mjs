import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnalytics,
  compareBatch,
  companiesByBatch,
  findBatchTrendExclusions,
  hiringByIndustry,
  regionDistribution,
  statusByBatch,
  tagCooccurrence,
  teamSizeBucket,
  teamSizeBucketsByIndustry,
  topTagsOverall,
  TEAM_SIZE_BUCKETS,
} from "../src/lib/analytics.mjs";

function makeCompany(overrides = {}) {
  return {
    id: 1,
    slug: "co",
    name: "Co",
    formerNames: [],
    oneLiner: "",
    longDescription: "",
    batch: "Winter 2020",
    batchSeason: "Winter",
    batchYear: 2020,
    status: "Active",
    teamSize: 10,
    industry: "B2B",
    subindustry: null,
    industries: ["B2B"],
    tags: ["SaaS"],
    regions: ["America / Canada"],
    allLocations: null,
    website: null,
    isHiring: false,
    topCompany: false,
    nonprofit: false,
    stage: null,
    launchedAt: null,
    smallLogoUrl: null,
    ycUrl: "https://www.ycombinator.com/companies/co",
    sourceUpdatedAt: "2026-05-18T00:00:00.000Z",
    ...overrides,
  };
}

test("teamSizeBucket maps team sizes into stable buckets", () => {
  assert.equal(teamSizeBucket(0), "1");
  assert.equal(teamSizeBucket(1), "1");
  assert.equal(teamSizeBucket(2), "2-5");
  assert.equal(teamSizeBucket(5), "2-5");
  assert.equal(teamSizeBucket(6), "6-10");
  assert.equal(teamSizeBucket(50), "11-50");
  assert.equal(teamSizeBucket(200), "51-200");
  assert.equal(teamSizeBucket(1000), "201-1000");
  assert.equal(teamSizeBucket(1001), "1001+");
  assert.equal(teamSizeBucket(null), "Unknown");
  assert.equal(teamSizeBucket(undefined), "Unknown");
  assert.equal(teamSizeBucket(-1), "Unknown");
  assert.deepEqual([...TEAM_SIZE_BUCKETS], [
    "1",
    "2-5",
    "6-10",
    "11-50",
    "51-200",
    "201-1000",
    "1001+",
    "Unknown",
  ]);
});

test("compareBatch orders by year then season Winter→Spring→Summer→Fall, Unknown last", () => {
  const batches = [
    { batch: "Fall 2020", batchYear: 2020, batchSeason: "Fall" },
    { batch: "Winter 2020", batchYear: 2020, batchSeason: "Winter" },
    { batch: "Summer 2019", batchYear: 2019, batchSeason: "Summer" },
    { batch: "Unknown", batchYear: null, batchSeason: "Unknown" },
    { batch: "Spring 2020", batchYear: 2020, batchSeason: "Spring" },
  ].sort(compareBatch);
  assert.deepEqual(
    batches.map((b) => b.batch),
    ["Summer 2019", "Winter 2020", "Spring 2020", "Fall 2020", "Unknown"]
  );
});

test("companiesByBatch returns sorted SeriesPoints", () => {
  const series = companiesByBatch([
    makeCompany({ id: 1, batch: "Winter 2020", batchSeason: "Winter", batchYear: 2020 }),
    makeCompany({ id: 2, batch: "Winter 2020", batchSeason: "Winter", batchYear: 2020 }),
    makeCompany({ id: 3, batch: "Summer 2019", batchSeason: "Summer", batchYear: 2019 }),
  ]);
  assert.deepEqual(series, [
    { label: "Summer 2019", value: 1, group: "Summer" },
    { label: "Winter 2020", value: 2, group: "Winter" },
  ]);
});

test("statusByBatch emits zeroed counts for every status key", () => {
  const points = statusByBatch([
    makeCompany({ id: 1, status: "Active" }),
    makeCompany({ id: 2, status: "Acquired" }),
    makeCompany({ id: 3, status: "Inactive" }),
  ]);
  assert.equal(points.length, 1);
  assert.deepEqual(points[0].counts, {
    Active: 1,
    Inactive: 1,
    Acquired: 1,
    Public: 0,
    Unknown: 0,
  });
  assert.equal(points[0].total, 3);
});

test("topTagsOverall ranks and limits tags", () => {
  const companies = [
    makeCompany({ id: 1, tags: ["AI", "SaaS"] }),
    makeCompany({ id: 2, tags: ["AI"] }),
    makeCompany({ id: 3, tags: ["AI", "Fintech"] }),
    makeCompany({ id: 4, tags: ["Fintech"] }),
  ];
  const top = topTagsOverall(companies, { limit: 2 });
  assert.deepEqual(top, [
    { label: "AI", value: 3 },
    { label: "Fintech", value: 2 },
  ]);
});

test("tagCooccurrence counts unordered pairs with stable ordering", () => {
  const edges = tagCooccurrence(
    [
      makeCompany({ id: 1, tags: ["AI", "SaaS"] }),
      makeCompany({ id: 2, tags: ["SaaS", "AI"] }),
      makeCompany({ id: 3, tags: ["AI", "Fintech"] }),
      makeCompany({ id: 4, tags: ["AI"] }),
    ],
    { minCount: 1, limit: 10 }
  );
  // (AI,SaaS) appears twice, (AI,Fintech) once
  const aiSaas = edges.find((e) => e.source === "AI" && e.target === "SaaS");
  const aiFintech = edges.find((e) => e.source === "AI" && e.target === "Fintech");
  assert.equal(aiSaas.count, 2);
  assert.equal(aiFintech.count, 1);
});

test("teamSizeBucketsByIndustry preserves bucket order per group and treats null as Unknown", () => {
  const buckets = teamSizeBucketsByIndustry([
    makeCompany({ id: 1, industry: "B2B", teamSize: 3 }),
    makeCompany({ id: 2, industry: "B2B", teamSize: 40 }),
    makeCompany({ id: 3, industry: "B2B", teamSize: null }),
    makeCompany({ id: 4, industry: "Consumer", teamSize: 1 }),
  ]);
  const b2b = buckets.filter((b) => b.group === "B2B");
  assert.deepEqual(
    b2b.map((b) => b.bucket),
    ["2-5", "11-50", "Unknown"]
  );
  // Null team size never collapses into "1".
  assert.equal(buckets.find((b) => b.bucket === "Unknown").count, 1);
});

test("regionDistribution falls back to Unknown for missing regions", () => {
  const series = regionDistribution([
    makeCompany({ id: 1, regions: ["America / Canada"] }),
    makeCompany({ id: 2, regions: [] }),
  ]);
  assert.deepEqual(series, [
    { label: "America / Canada", value: 1 },
    { label: "Unknown", value: 1 },
  ]);
});

test("hiringByIndustry computes hiring rate per industry", () => {
  const points = hiringByIndustry([
    makeCompany({ id: 1, industry: "B2B", isHiring: true }),
    makeCompany({ id: 2, industry: "B2B", isHiring: false }),
    makeCompany({ id: 3, industry: "Fintech", isHiring: true }),
  ]);
  const b2b = points.find((p) => p.industry === "B2B");
  const fintech = points.find((p) => p.industry === "Fintech");
  assert.equal(b2b.total, 2);
  assert.equal(b2b.hiring, 1);
  assert.equal(b2b.hiringRate, 0.5);
  assert.equal(fintech.hiringRate, 1);
});

test("findBatchTrendExclusions flags companies with unknown season or year", () => {
  const exclusions = findBatchTrendExclusions([
    makeCompany({ id: 1 }),
    makeCompany({ id: 2, batch: "", batchSeason: "Unknown", batchYear: null }),
    makeCompany({ id: 3, batch: "Unknown 2020", batchSeason: "Unknown", batchYear: 2020 }),
  ]);
  assert.equal(exclusions.length, 2);
  assert.equal(exclusions[0].id, 2);
  assert.equal(exclusions[1].id, 3);
});

test("buildAnalytics excludes undated companies from batch trends but keeps them in overall counts", () => {
  const companies = [
    makeCompany({ id: 1, batch: "Winter 2020" }),
    makeCompany({ id: 2, batch: "Summer 2021", batchSeason: "Summer", batchYear: 2021 }),
    makeCompany({ id: 3, batch: "", batchSeason: "Unknown", batchYear: null }),
  ];
  const bundle = buildAnalytics(companies, { generatedAt: "2026-05-18T00:00:00.000Z" });
  assert.equal(bundle.summary.totalCompanies, 3);
  assert.equal(bundle.summary.excludedFromBatchTrends.length, 1);
  // The batch-trend series should only include the two dated batches.
  assert.equal(bundle.companiesByBatch.length, 2);
  assert.equal(bundle.batchTrends.length, 2);
});
