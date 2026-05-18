export type CompanyStatus =
  | "Active"
  | "Inactive"
  | "Acquired"
  | "Public"
  | "Unknown";

export type BatchSeason =
  | "Winter"
  | "Spring"
  | "Summer"
  | "Fall"
  | "Unknown";

export type Company = {
  id: number;
  slug: string;
  name: string;
  formerNames: string[];
  oneLiner: string;
  longDescription: string;
  batch: string;
  batchSeason: BatchSeason;
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

export const COMPANY_STATUSES: readonly CompanyStatus[] = [
  "Active",
  "Inactive",
  "Acquired",
  "Public",
  "Unknown",
];

export const BATCH_SEASONS: readonly BatchSeason[] = [
  "Winter",
  "Spring",
  "Summer",
  "Fall",
  "Unknown",
];

export const YC_COMPANIES_BASE_URL = "https://www.ycombinator.com/companies";
export const COMPANY_SCHEMA_VERSION = "current-directory-v1";
