import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateCompanies } from "./yc-normalize.mjs";

const path = resolve(process.cwd(), process.argv[2] ?? "data/yc/companies.json");
const payload = JSON.parse(await readFile(path, "utf8"));
const companies = Array.isArray(payload) ? payload : payload.companies;

if (!Array.isArray(companies)) {
  throw new Error(`Could not find companies array in ${path}`);
}

const validation = validateCompanies(companies);

console.log(`Total normalized companies: ${validation.total}`);
console.log("Counts by status:");
for (const [status, count] of Object.entries(validation.statusCounts)) {
  console.log(`  ${status}: ${count}`);
}
console.log("Top 10 industries:");
for (const item of validation.topIndustries) {
  console.log(`  ${item.value}: ${item.count}`);
}
console.log("Top 10 tags:");
for (const item of validation.topTags) {
  console.log(`  ${item.value}: ${item.count}`);
}
console.log(`Missing id/slug/name: ${validation.missingIdentity.length}`);
console.log(`Invalid normalized fields: ${validation.invalid.length}`);

if (validation.missingIdentity.length > 0) {
  console.log(JSON.stringify(validation.missingIdentity, null, 2));
}

if (validation.invalid.length > 0) {
  console.log(JSON.stringify(validation.invalid, null, 2));
}

if (validation.missingIdentity.length > 0 || validation.invalid.length > 0) {
  process.exitCode = 1;
}
