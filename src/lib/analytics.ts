import type { BatchSeason, Company, CompanyStatus } from "./schema.js";

export type SeriesPoint = {
  label: string;
  value: number;
  group?: string;
};

export type BatchTrendPoint = {
  batch: string;
  batchYear: number | null;
  batchSeason: BatchSeason;
  totalCompanies: number;
  activeCompanies: number;
  hiringCompanies: number;
  topIndustries: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
};

export type StatusByBatchPoint = {
  batch: string;
  batchYear: number | null;
  batchSeason: BatchSeason;
  total: number;
  counts: Record<CompanyStatus, number>;
};

export type IndustryMixPoint = {
  batch: string;
  batchYear: number | null;
  batchSeason: BatchSeason;
  industry: string;
  count: number;
  share: number;
};

export type HiringByBatchPoint = {
  batch: string;
  batchYear: number | null;
  batchSeason: BatchSeason;
  industry: string | null;
  total: number;
  hiring: number;
  hiringRate: number;
};

export type TeamSizeBucket =
  | "1"
  | "2-5"
  | "6-10"
  | "11-50"
  | "51-200"
  | "201-1000"
  | "1001+"
  | "Unknown";

export type TeamSizeBucketPoint = {
  bucket: TeamSizeBucket;
  group: string;
  count: number;
};

export type CooccurrenceEdge = {
  source: string;
  target: string;
  count: number;
};

export type AnalyticsSummary = {
  generatedAt: string;
  sourceUpdatedAt: string | null;
  totalCompanies: number;
  excludedFromBatchTrends: Array<{ id: number; slug: string; reason: string }>;
  distinctBatchCount: number;
  distinctIndustryCount: number;
  distinctTagCount: number;
  distinctRegionCount: number;
  statusCounts: Record<string, number>;
  topTags: Array<{ name: string; count: number }>;
  topIndustries: Array<{ name: string; count: number }>;
  topRegions: Array<{ name: string; count: number }>;
};

export type AnalyticsBundle = {
  summary: AnalyticsSummary;
  companiesByBatch: SeriesPoint[];
  statusByBatch: StatusByBatchPoint[];
  industryMixByBatch: IndustryMixPoint[];
  batchTrends: BatchTrendPoint[];
  topTagsOverall: SeriesPoint[];
  topTagsByBatch: Array<{
    batch: string;
    batchYear: number | null;
    batchSeason: BatchSeason;
    tags: Array<{ name: string; count: number }>;
  }>;
  hiringByBatch: HiringByBatchPoint[];
  hiringByIndustry: HiringByBatchPoint[];
  teamSizeBucketsByIndustry: TeamSizeBucketPoint[];
  teamSizeBucketsByStatus: TeamSizeBucketPoint[];
  regionDistribution: SeriesPoint[];
  tagCooccurrence: CooccurrenceEdge[];
};

export const TEAM_SIZE_BUCKETS: readonly TeamSizeBucket[] = [
  "1",
  "2-5",
  "6-10",
  "11-50",
  "51-200",
  "201-1000",
  "1001+",
  "Unknown",
];

export const BATCH_SEASON_ORDER: Record<BatchSeason, number> = {
  Winter: 0,
  Spring: 1,
  Summer: 2,
  Fall: 3,
  Unknown: 99,
};

export declare function buildAnalytics(
  companies: Company[],
  options?: { generatedAt?: string }
): AnalyticsBundle;
