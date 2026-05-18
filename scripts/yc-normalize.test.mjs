import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCompany, parseBatch, unixTimestampToIso, validateCompanies } from "./yc-normalize.mjs";

test("parseBatch handles long and short YC batch labels", () => {
  assert.deepEqual(parseBatch("Winter 2009"), { batchSeason: "Winter", batchYear: 2009 });
  assert.deepEqual(parseBatch("Spring 2026"), { batchSeason: "Spring", batchYear: 2026 });
  assert.deepEqual(parseBatch("S21"), { batchSeason: "Summer", batchYear: 2021 });
  assert.deepEqual(parseBatch("F24"), { batchSeason: "Fall", batchYear: 2024 });
});

test("unixTimestampToIso converts seconds and ignores empty values", () => {
  assert.equal(unixTimestampToIso(1326790856), "2012-01-17T09:00:56.000Z");
  assert.equal(unixTimestampToIso(null), null);
  assert.equal(unixTimestampToIso(""), null);
});

test("normalizeCompany maps YC index fields into the shared Company schema", () => {
  const company = normalizeCompany(
    {
      id: 271,
      name: "Airbnb",
      slug: "airbnb",
      former_names: ["AirBed & Breakfast"],
      small_logo_thumb_url: "",
      website: "http://airbnb.com",
      all_locations: "San Francisco, CA, USA",
      long_description: "",
      one_liner: "Book accommodations around the world.",
      team_size: 6132,
      industry: "Consumer",
      subindustry: "Consumer -> Travel, Leisure and Tourism",
      launched_at: 1326790856,
      tags: ["Marketplace", "Travel"],
      top_company: true,
      isHiring: false,
      nonprofit: false,
      batch: "Winter 2009",
      status: "Public",
      industries: ["Consumer", "Travel, Leisure and Tourism"],
      regions: ["United States of America", "America / Canada"],
      stage: "",
    },
    "2026-05-18T00:00:00.000Z",
  );

  assert.equal(company.id, 271);
  assert.equal(company.slug, "airbnb");
  assert.equal(company.batchSeason, "Winter");
  assert.equal(company.batchYear, 2009);
  assert.equal(company.status, "Public");
  assert.equal(company.smallLogoUrl, null);
  assert.equal(company.stage, null);
  assert.equal(company.ycUrl, "https://www.ycombinator.com/companies/airbnb");
  assert.deepEqual(company.tags, ["Marketplace", "Travel"]);
});

test("validateCompanies reports missing identity fields", () => {
  const validation = validateCompanies([
    normalizeCompany({ id: 1, slug: "ok", name: "OK" }, "2026-05-18T00:00:00.000Z"),
    normalizeCompany({ id: 0, slug: "", name: "" }, "2026-05-18T00:00:00.000Z"),
  ]);

  assert.equal(validation.total, 2);
  assert.equal(validation.missingIdentity.length, 1);
});
