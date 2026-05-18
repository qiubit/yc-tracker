# YC Tracker Agent Prompts

This directory contains ready-to-use prompts for building the YC Tracker MVP with multiple agents.

Use `shared-context.md` as the first context block for every agent, then append one specialist prompt from `agents/`.

Recommended order:

1. `agents/00-integrator.md`
2. `agents/01-data-ingestion.md`
3. `agents/02-profile-enrichment.md`
4. `agents/03-search-semantic-layer.md`
5. `agents/04-analytics-visualization.md`
6. `agents/05-product-ui.md`
7. `agents/06-backend-api.md`
8. `agents/07-qa-verification.md`

For parallel work, start agents 1, 3, 4, 5, and 6 together after the integrator confirms the initial schema. Agent 2 can run after the ingestion agent produces slugs. Agent 7 should begin once there is a runnable app or import output to verify.

