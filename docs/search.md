# Search and Similarity Notes

Agent 03 owns the local discovery layer in `src/lib/search.mjs`. It operates on the normalized `Company` records from `data/yc/companies.json` and does not fetch YC data or require external APIs.

## Public Service Functions

- `searchCompaniesBody(store, params)`: returns a search response body for `q`, `limit`, and `offset`.
- `getSimilarCompaniesBody(store, slug, params)`: returns related companies for a source company slug.
- `searchScore(company, query)`: returns a numeric lexical score for list filtering.
- `rankSearchResults(store, query)`: lower-level ranked entries for tests or future adapters.
- `rankSimilarCompanies(companies, sourceCompany)`: lower-level similarity ranking.

`src/lib/api.mjs` keeps the existing API route contract and wraps these bodies with the API metadata envelope:

- `GET /api/search?q=developer%20tools`
- `GET /api/companies/:slug/similar`
- `GET /api/companies?q=developer%20tools&sort=relevance` for ranked explorer lists that still support normal company filters.

Search result rows include both compact top-level fields and the full normalized `company` object:

```js
{
  id,
  slug,
  name,
  oneLiner,
  tags,
  industry,
  subindustry,
  batch,
  status,
  ycUrl,
  company,
  score,
  matchedFields,
  matchedTerms,
  reasons
}
```

Similarity rows use the same compact fields and add `reasons`, such as shared industry, subindustry, tags, batch, or terms.

## Ranking

Search is lexical full-text ranking over:

- name
- former names
- slug
- one-liner
- long description
- tags
- industry
- subindustry
- industries
- batch
- regions
- locations

Field weights intentionally favor identity and summary fields:

- Name, former names, and slug get the strongest weight.
- One-liner, tags, industry, and subindustry are the next tier.
- Long descriptions help recall but have lower weight so verbose profiles do not dominate.
- Exact company-name or slug token matches get an extra boost. This keeps queries like `stripe payments fintech` anchored on Stripe while still surfacing similar payment companies.
- Query terms are tokenized with small synonym expansion for common YC discovery language, including `ai`, `developer`, `payments`, `crypto`, `healthcare`, and `observability`.
- Batch phrases such as `Winter 2024`, `W24`, and `S24` are recognized and boosted in the batch field.

Queries matching `companies like <company name or slug>` switch from lexical ranking to local similarity ranking. The source company is excluded from results.

## Similarity

Similarity compares:

- one-liner
- long description
- tags
- industry
- subindustry
- industries
- regions
- batch

Metadata overlaps are weighted most heavily for industry, subindustry, and tags. Text overlap from one-liner, tags, descriptions, and industry fields adds recall and produces `matchedTerms`. The score is deterministic and local; there is no embedding dependency in the MVP path.

## Embeddings

Embeddings are intentionally deferred. The stable interface is already in place through `searchCompaniesBody` and `getSimilarCompaniesBody`, so a future embedding adapter can rerank or replace lexical scoring without changing UI calls.

If a provider is configured later, add a separate embedding table keyed by `company.id` and keep the normalized `Company` schema unchanged. Proposed SQLite shape:

```sql
CREATE TABLE IF NOT EXISTS company_embeddings (
  company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  embedding_json TEXT NOT NULL,
  source_text_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

## Verification

Run the focused eval:

```sh
npm run search:eval
```

Default eval queries:

- `airbnb travel marketplace`
- `stripe payments fintech`
- `ai agent finance`
- `healthcare workflow`
- `developer tools observability`

The command prints top results, scores, matched fields, and a small `rippling` similarity smoke check for manual sanity review.
