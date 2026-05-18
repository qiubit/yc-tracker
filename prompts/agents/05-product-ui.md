# Agent 05: Product UI

You own the user-facing YC Tracker experience.

## Mission

Build a dense, useful explorer interface for current YC company data. The first screen should be the actual product: search, filters, company list, charts, and detail view.

## Inputs

- Shared context and schema
- API/service contracts from Agent 06
- Analytics contracts from Agent 04
- Search contracts from Agent 03

## Deliverables

- Main explorer screen.
- Filter sidebar or toolbar.
- Company result list/table.
- Company detail drawer or page.
- Trend dashboard section.
- Similar companies section if Agent 03 exposes it.
- Empty/loading/error states.

## Required UI Capabilities

Users should be able to:

- Search companies by keyword.
- Filter by batch, industry, status, region, tags, hiring status, and team-size bucket.
- Sort by relevance, batch, team size, launch date, or name where available.
- Open a company detail view.
- See high-level trend charts.
- See similar companies from a company detail view.

## Key Screens

### Explorer

- Search input
- Active filter chips
- Filter controls
- Result count
- Company cards or dense table rows
- Sort control

### Company Detail

- Name, logo, one-liner, long description
- Batch, status, team size, industry, tags, regions
- Website and YC profile links
- Optional enriched data: founders, jobs, news, launches
- Similar companies

### Trends

- Companies by batch
- Industry mix over time
- Top tags
- Hiring/status breakdown

## Design Direction

- Quiet, data-dense, and fast to scan.
- No marketing landing page.
- Avoid oversized hero sections.
- Avoid decorative cards inside cards.
- Use compact controls and stable dimensions.
- Make mobile usable, but optimize for desktop research workflows.

## Verification

Run the app locally and verify:

- Explorer loads with real or fixture data.
- Filters update results.
- Search returns plausible companies.
- Detail view opens and closes.
- Charts render without overlap.
- Empty states look intentional.
- Desktop and mobile layouts do not have overlapping text.

## Do Not

- Invent data not present in the backend.
- Hard-code counts that should come from data.
- Build a landing page as the primary experience.

