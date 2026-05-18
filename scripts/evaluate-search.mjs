#!/usr/bin/env node
import { loadCompanyStore } from "../src/lib/db.mjs";
import { getSimilarCompaniesBody, searchCompaniesBody } from "../src/lib/search.mjs";

const DEFAULT_QUERIES = [
  "airbnb travel marketplace",
  "stripe payments fintech",
  "ai agent finance",
  "healthcare workflow",
  "developer tools observability",
];

const queries = process.argv.slice(2);
const store = await loadCompanyStore();

for (const query of queries.length > 0 ? queries : DEFAULT_QUERIES) {
  const response = searchCompaniesBody(store, { q: query, limit: "5" });
  printSearch(query, response);
}

const similar = getSimilarCompaniesBody(store, "rippling", { limit: "5" });
printSimilar("rippling", similar);

function printSearch(query, response) {
  console.log(`\n# ${query}`);
  console.log(`mode=${response.rankingMode} total=${response.pagination.total}`);
  for (const [index, result] of response.data.entries()) {
    const fields = result.matchedFields
      .slice(0, 3)
      .map((field) => `${field.field}:${field.matchedTerms.slice(0, 4).join("|")}`)
      .join(", ");
    console.log(
      `${index + 1}. ${result.name} (${result.batch}, ${result.industry ?? "Unknown"}) score=${result.score} slug=${result.slug}`,
    );
    console.log(`   ${result.oneLiner}`);
    console.log(`   matches=${fields || result.matchedTerms.slice(0, 8).join(", ")}`);
  }
}

function printSimilar(slug, response) {
  console.log(`\n# similar to ${slug}`);
  for (const [index, result] of response.data.entries()) {
    console.log(
      `${index + 1}. ${result.name} (${result.batch}, ${result.industry ?? "Unknown"}) score=${result.score} slug=${result.slug}`,
    );
    console.log(`   ${result.oneLiner}`);
    console.log(`   reasons=${result.reasons.slice(0, 3).join("; ")}`);
  }
}
