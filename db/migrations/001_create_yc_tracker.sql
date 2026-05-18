-- SQLite storage contract for the YC Tracker MVP.
-- Agent 06 owns the serving-layer expectations here; Agent 01 can wire this
-- into the import flow without changing the shared Company schema.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS raw_source_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  UNIQUE (source, source_url, fetched_at)
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  one_liner TEXT NOT NULL DEFAULT '',
  long_description TEXT NOT NULL DEFAULT '',
  batch TEXT NOT NULL DEFAULT '',
  batch_season TEXT NOT NULL DEFAULT 'Unknown',
  batch_year INTEGER,
  status TEXT NOT NULL DEFAULT 'Unknown',
  team_size INTEGER,
  industry TEXT,
  subindustry TEXT,
  all_locations TEXT,
  website TEXT,
  is_hiring INTEGER NOT NULL DEFAULT 0,
  top_company INTEGER NOT NULL DEFAULT 0,
  nonprofit INTEGER NOT NULL DEFAULT 0,
  stage TEXT,
  launched_at TEXT,
  small_logo_url TEXT,
  yc_url TEXT NOT NULL,
  source_updated_at TEXT NOT NULL,
  raw_directory_record_id INTEGER REFERENCES raw_source_records(id),
  raw_profile_record_id INTEGER REFERENCES raw_source_records(id)
);

CREATE TABLE IF NOT EXISTS company_former_names (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  PRIMARY KEY (company_id, value)
);

CREATE TABLE IF NOT EXISTS company_industries (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  PRIMARY KEY (company_id, value)
);

CREATE TABLE IF NOT EXISTS company_tags (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  PRIMARY KEY (company_id, value)
);

CREATE TABLE IF NOT EXISTS company_regions (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  PRIMARY KEY (company_id, value)
);

CREATE TABLE IF NOT EXISTS founders (
  user_id INTEGER,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  linkedin_url TEXT,
  twitter_url TEXT,
  avatar_url TEXT,
  PRIMARY KEY (company_id, full_name)
);

CREATE TABLE IF NOT EXISTS job_postings (
  id TEXT NOT NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  role TEXT,
  type TEXT,
  location TEXT,
  salary_range TEXT,
  equity_range TEXT,
  min_experience TEXT,
  visa TEXT,
  url TEXT,
  apply_url TEXT,
  PRIMARY KEY (company_id, id)
);

CREATE TABLE IF NOT EXISTS job_posting_skills (
  company_id INTEGER NOT NULL,
  job_id TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (company_id, job_id, value),
  FOREIGN KEY (company_id, job_id) REFERENCES job_postings(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS news_items (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  date TEXT,
  PRIMARY KEY (company_id, url)
);

CREATE TABLE IF NOT EXISTS launch_posts (
  id TEXT NOT NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tagline TEXT,
  body TEXT,
  url TEXT,
  created_at TEXT,
  vote_count INTEGER,
  PRIMARY KEY (company_id, id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS company_search USING fts5(
  name,
  one_liner,
  long_description,
  batch,
  industry,
  subindustry,
  tags,
  content='companies',
  content_rowid='id'
);

CREATE INDEX IF NOT EXISTS idx_companies_batch ON companies(batch);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_is_hiring ON companies(is_hiring);
CREATE INDEX IF NOT EXISTS idx_company_tags_value ON company_tags(value);
CREATE INDEX IF NOT EXISTS idx_company_regions_value ON company_regions(value);
