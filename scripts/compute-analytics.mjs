import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAnalytics } from "../src/lib/analytics.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_INPUT = resolve(ROOT, "data/yc/companies.json");
const DEFAULT_OUTPUT = resolve(ROOT, "data/yc/analytics.json");

const options = parseArgs(process.argv.slice(2));
const inputPath = resolve(ROOT, options.input ?? DEFAULT_INPUT);
const outputPath = resolve(ROOT, options.output ?? DEFAULT_OUTPUT);

const raw = JSON.parse(await readFile(inputPath, "utf8"));
const companies = Array.isArray(raw) ? raw : raw.companies;
if (!Array.isArray(companies)) {
  throw new Error(`No companies array found in ${inputPath}`);
}

const generatedAt = new Date().toISOString();
const analytics = buildAnalytics(companies, { generatedAt });

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(analytics, null, 2), "utf8");

const { summary } = analytics;
console.log(`Wrote analytics to ${outputPath}`);
console.log(`  total companies        : ${summary.totalCompanies}`);
console.log(`  distinct batches       : ${summary.distinctBatchCount}`);
console.log(`  distinct industries    : ${summary.distinctIndustryCount}`);
console.log(`  distinct tags          : ${summary.distinctTagCount}`);
console.log(`  distinct regions       : ${summary.distinctRegionCount}`);
console.log(`  excluded (batch trends): ${summary.excludedFromBatchTrends.length}`);
console.log("  top tags (5):");
for (const tag of summary.topTags.slice(0, 5)) {
  console.log(`    - ${tag.name}: ${tag.count}`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const eq = token.indexOf("=");
    const key = eq >= 0 ? token.slice(2, eq) : token.slice(2);
    const value = eq >= 0 ? token.slice(eq + 1) : argv[++i];
    out[camelCase(key)] = value;
  }
  return out;
}

function camelCase(value) {
  return value.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}
