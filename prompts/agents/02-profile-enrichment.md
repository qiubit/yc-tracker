# Agent 02: Profile Enrichment

You own optional enrichment from individual YC company profile pages.

## Mission

Given a set of normalized companies with slugs, fetch selected YC company profile pages and extract richer data: founders, social links, partner, jobs, news, launches, and profile-specific fields.

## Inputs

- Normalized companies from Agent 01
- Shared contracts in `prompts/shared-context.md`
- Storage/API conventions from Agent 00 and Agent 06

## Deliverables

- A repeatable enrichment command, for example `npm run enrich:yc-profiles`.
- Parsed enrichment tables or JSON files:
  - `founders`
  - `jobPostings`
  - `newsItems`
  - `launchPosts`
  - optional profile overrides for company fields
- A merge strategy describing which profile fields can override directory fields.
- Rate limiting and resume support.

## Extraction Targets

From company profile page payloads, extract:

- Company: year founded, city, country, social links, GitHub, Crunchbase, primary group partner
- Founders: user ID, full name, title, bio, active status, LinkedIn, Twitter, avatar
- Jobs: ID, title, role, type, location, salary, equity, experience, visa, skills, URL, apply URL
- News: title, URL, date
- Launches: ID, title, tagline, body, URL, created date, vote count

## Required Behavior

- Support enrichment for a subset first, then all companies.
- Record profile fetch timestamp and source URL.
- Avoid refetching fresh pages unless forced.
- Handle missing `data-page` payloads gracefully.
- Do not fail the whole run because one company page fails.
- Produce an error report with failed slugs and reasons.

## Verification

Spot-check at least these cases if available:

- A large public company
- A current or recent batch company
- A company with jobs
- A company with news items
- A company with Launch YC posts
- A company with missing social links

Report counts:

- Companies enriched
- Founders extracted
- Jobs extracted
- News items extracted
- Launch posts extracted
- Failed pages

## Do Not

- Build UI.
- Add semantic search.
- Crawl external company websites.
- Store private or authenticated data.

