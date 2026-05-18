# Shared Context: YC Tracker MVP

We are building a current-data YC startup knowledge explorer around the public Y Combinator Startup Directory.

The first MVP should use current YC directory data, not historical Internet Archive data. The product should be more useful than a plain directory by exposing patterns across batches, industries, tags, geography, status, hiring, and company descriptions.

## Product Goal

Build a local/current-data YC knowledge explorer that:

- Ingests public YC company records.
- Normalizes company data into a stable schema.
- Lets users explore companies with filters and search.
- Visualizes batch, industry, tag, status, team size, and hiring trends.
- Supports semantic discovery over one-liners and descriptions.
- Optionally enriches company detail pages with founders, jobs, news, launches, and social links.

## Known Public Data

The YC Startup Directory currently exposes roughly 5,900 public company records through the site-backed search index. Directory records include fields such as:

- `id`
- `name`
- `slug`
- `former_names`
- `small_logo_thumb_url`
- `website`
- `all_locations`
- `long_description`
- `one_liner`
- `team_size`
- `industry`
- `subindustry`
- `launched_at`
- `tags`
- `tags_highlighted`
- `top_company`
- `isHiring`
- `nonprofit`
- `batch`
- `status`
- `industries`
- `regions`
- `stage`
- `app_video_public`
- `demo_day_video_public`
- `app_answers`
- `question_answers`

Individual company profile pages may add:

- Founded year
- City/country
- LinkedIn, X/Twitter, Facebook, Crunchbase, GitHub
- Primary group partner
- Founders with bios, titles, social links, active status, avatars
- Jobs with title, role, location, salary, equity, experience, visa, skills, apply URL
- News items
- Launch YC posts
- Public app/demo-day video URLs or flags

## Shared Canonical Schema

Use this as the initial normalized company contract. If you must change it, coordinate with the integrator and update this file.

```ts
export type CompanyStatus = "Active" | "Inactive" | "Acquired" | "Public" | "Unknown";

export type Company = {
  id: number;
  slug: string;
  name: string;
  formerNames: string[];
  oneLiner: string;
  longDescription: string;
  batch: string;
  batchSeason: "Winter" | "Spring" | "Summer" | "Fall" | "Unknown";
  batchYear: number | null;
  status: CompanyStatus;
  teamSize: number | null;
  industry: string | null;
  subindustry: string | null;
  industries: string[];
  tags: string[];
  regions: string[];
  allLocations: string | null;
  website: string | null;
  isHiring: boolean;
  topCompany: boolean;
  nonprofit: boolean;
  stage: string | null;
  launchedAt: string | null;
  smallLogoUrl: string | null;
  ycUrl: string;
  sourceUpdatedAt: string;
};
```

Optional enrichment contracts:

```ts
export type Founder = {
  userId: number | null;
  companyId: number;
  fullName: string;
  title: string | null;
  bio: string | null;
  isActive: boolean;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  avatarUrl: string | null;
};

export type JobPosting = {
  id: number | string;
  companyId: number;
  title: string;
  role: string | null;
  type: string | null;
  location: string | null;
  salaryRange: string | null;
  equityRange: string | null;
  minExperience: string | null;
  visa: string | null;
  skills: string[];
  url: string | null;
  applyUrl: string | null;
};

export type NewsItem = {
  companyId: number;
  title: string;
  url: string;
  date: string | null;
};

export type LaunchPost = {
  id: number | string;
  companyId: number;
  title: string;
  tagline: string | null;
  body: string | null;
  url: string | null;
  createdAt: string | null;
  voteCount: number | null;
};
```

Provenance contracts:

```ts
export type SourceKind = "yc-directory-index" | "yc-company-profile";

export type RawSourceRecord = {
  source: SourceKind;
  sourceUrl: string;
  fetchedAt: string;
  payload: unknown;
};

export type CompanyRecordBundle = {
  company: Company;
  rawDirectoryRecord: RawSourceRecord;
  rawProfileRecord?: RawSourceRecord;
  founders?: Founder[];
  jobs?: JobPosting[];
  news?: NewsItem[];
  launchPosts?: LaunchPost[];
};
```

## Product Principles

- First screen should be the usable explorer, not a marketing landing page.
- Prefer dense, scan-friendly UI: filters, table/list, charts, and detail drawer.
- Keep provenance: store raw source records and source timestamps.
- Do not overbuild historical support in MVP.
- Make missing data explicit rather than pretending records are complete.
- Respect the source site: use caching, low request rates, and avoid unnecessary profile-page crawling.

## Suggested Tech Direction

If the repo is empty, choose a boring stack:

- Next.js or Vite React app for UI
- SQLite for local MVP storage
- TypeScript import scripts
- Recharts, Observable Plot, or similar for charts
- Local full-text search first
- Embeddings can be a second pass if no API keys are configured

If the repo already has a stack, follow the existing stack.
