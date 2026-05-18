# Agent 01: Data Ingestion

You own the current YC directory importer.

## Mission

Fetch public company records from the current YC Startup Directory search data source, save the raw records, normalize them into the shared schema, and make the import repeatable.

## Inputs

- `prompts/shared-context.md`
- Existing project structure and package manager
- Any schema/storage decisions from Agent 00

## Deliverables

- An import command, for example `npm run import:yc` or `scripts/import-yc-companies.ts`.
- Raw data output or table containing untouched source records.
- Normalized company output or table matching the shared `Company` schema.
- Import metadata: source URL/index, fetched timestamp, record count.
- Basic tests or validation checks for normalization.

## Required Behavior

- Fetch all public company records, not just the first page.
- Support pagination.
- Be polite: retry with backoff and cache where reasonable.
- Preserve `id`, `slug`, `name`, source payload, and fetch timestamp.
- Parse `batch` into `batchSeason` and `batchYear`.
- Convert `launched_at` Unix timestamps into ISO strings.
- Normalize empty strings to `null` where appropriate.
- Keep arrays as arrays: tags, industries, regions, former names.

## Fields To Normalize

- `id`
- `slug`
- `name`
- `formerNames`
- `oneLiner`
- `longDescription`
- `batch`
- `batchSeason`
- `batchYear`
- `status`
- `teamSize`
- `industry`
- `subindustry`
- `industries`
- `tags`
- `regions`
- `allLocations`
- `website`
- `isHiring`
- `topCompany`
- `nonprofit`
- `stage`
- `launchedAt`
- `smallLogoUrl`
- `ycUrl`
- `sourceUpdatedAt`

## Verification

Run the importer and report:

- Total fetched companies
- Total normalized companies
- Counts by status
- Top 10 industries
- Top 10 tags
- Any records missing `id`, `slug`, or `name`

## Do Not

- Crawl every individual company page in this agent.
- Add embeddings or analytics logic.
- Change the shared schema without coordinating with Agent 00.

