PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  bio TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO users (user_id, nickname, bio)
VALUES (1, 'guest', NULL);

CREATE TABLE IF NOT EXISTS checkins (
  checkin_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  nickname TEXT NOT NULL,
  avatar_id TEXT NOT NULL,
  seat_number TEXT NOT NULL,
  task_description TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reactions (
  reaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkin_id INTEGER NOT NULL,
  sender_nickname TEXT NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checkin_id) REFERENCES checkins(checkin_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkin_id INTEGER NOT NULL,
  sender_nickname TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checkin_id) REFERENCES checkins(checkin_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS long_term_profiles (
  profile_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL UNIQUE,
  current_focus TEXT NOT NULL,
  desired_connections TEXT NOT NULL,
  profile_text TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_infos (
  job_info_id INTEGER PRIMARY KEY AUTOINCREMENT,
  submitter_nickname TEXT NOT NULL,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  selection_type TEXT NOT NULL CHECK (selection_type IN ('本選考', 'インターン')),
  start_period TEXT NOT NULL,
  end_period TEXT NOT NULL,
  selection_features TEXT NOT NULL,
  company_impression TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO app_metadata (key, value) VALUES ('checkins_version', 0);

-- Active-seat queries and the monitor refresh are the hottest paths.
CREATE INDEX IF NOT EXISTS idx_checkins_active_created
  ON checkins (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_active_seat
  ON checkins (is_active, seat_number);
CREATE INDEX IF NOT EXISTS idx_checkins_active_nickname
  ON checkins (is_active, nickname);

-- These indexes avoid full scans while assembling check-in details.
CREATE INDEX IF NOT EXISTS idx_reactions_checkin_created
  ON reactions (checkin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_checkin_created
  ON comments (checkin_id, created_at);

CREATE INDEX IF NOT EXISTS idx_long_term_profiles_updated
  ON long_term_profiles (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_infos_created
  ON job_infos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_infos_company
  ON job_infos (company_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_job_infos_submitter
  ON job_infos (submitter_nickname);
