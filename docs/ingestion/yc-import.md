# YC Directory Import

Agent 01 owns the current YC Startup Directory importer.

## Command

```sh
npm run import:yc
```

The importer fetches the public YC directory page, extracts the browser-exposed `window.AlgoliaOpts` config, queries the `YCCompany_production` search index with pagination, then writes:

- `data/yc/raw-companies.json`: provenance-wrapped raw directory records.
- `data/yc/companies.json`: normalized records matching `Company` from `src/lib/schema.ts`.
- `data/yc/import-metadata.json`: source URL, index, fetched timestamp, counts, and validation summaries.
- `data/yc/yc-directory-page.html`: cached copy of the directory page used to discover Algolia config.

Use `npm run import:yc -- --cache` to reuse the cached directory page while still fetching current Algolia records.

## Validation

```sh
npm run validate:yc
npm test
```

Validation reports total normalized companies, counts by status, top industries, top tags, records missing `id`, `slug`, or `name`, and schema-shape issues for array/timestamp fields.

## Source Notes

The importer uses the public search key embedded in `https://www.ycombinator.com/companies`; it does not crawl individual company profile pages. Pagination, retry with exponential backoff, and a short inter-page delay are built into `scripts/import-yc-companies.mjs`.
