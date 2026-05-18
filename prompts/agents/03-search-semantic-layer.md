# Agent 03: Search and Semantic Layer

You own discovery: keyword search, filters, and similar-company logic.

## Mission

Make YC company data searchable and explorable beyond exact filters. Implement full-text search first, then semantic similarity if dependencies/API keys are available.

## Inputs

- Normalized companies from Agent 01
- Optional enriched data from Agent 02
- Backend conventions from Agent 06

## Deliverables

- Full-text search over company name, one-liner, long description, tags, industry, and subindustry.
- Similar-company function based on one-liner + long description + tags.
- Search API contract or service functions.
- Optional embedding generation command and storage table.
- Ranking notes documenting how results are scored.

## MVP Search Requirements

Support queries like:

- `AI bookkeeping`
- `developer tools for data teams`
- `fintech compliance`
- `companies like Rippling`
- `B2B infrastructure Winter 2024`

Search should return:

- Company ID/slug/name
- One-liner
- Matched fields or score
- Tags/industry/batch/status
- YC profile URL

## Similarity Requirements

For `GET /companies/:slug/similar` or equivalent service:

- Compare against one-liner, long description, tags, industry, and subindustry.
- Exclude the source company.
- Return top N similar companies.
- Include a short reason or matched terms if feasible.

## Implementation Strategy

- Start with local full-text search if the stack supports it.
- Use embeddings only if the repo has configured providers or local embedding tooling.
- Keep the interface stable so UI can call search without caring whether ranking is lexical or semantic.

## Verification

Create a small eval script or test cases with known queries:

- `airbnb travel marketplace`
- `stripe payments fintech`
- `ai agent finance`
- `healthcare workflow`
- `developer tools observability`

For each, print top results and manually sanity-check that results are plausible.

## Do Not

- Fetch YC data yourself unless needed for a local fixture.
- Build visual charts.
- Add paid external enrichment.
- Block MVP on embeddings.

