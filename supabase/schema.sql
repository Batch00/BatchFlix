-- BatchFlix database schema
-- Target: the shared Batch Apps Supabase project, schema `batchflix`.
--
-- KEEP THIS FILE IN SYNC. Any migration run against the live database must be
-- reflected here in the same change. This file drifted badly once already: it
-- was missing the tv_progress and year_in_review_snapshots tables entirely,
-- plus lists.position, lists.parent_list_id, lists.rules and
-- media_items.total_episodes, all of which the application depends on.
--
-- This file is structure only. It contains no seed data and no personal data
-- migrations, so it can be run start to finish against a fresh Supabase
-- project to stand up the app. Every statement is written to be re-runnable.
--
-- Reconstructed from supabase/schema.sql, SUBLISTS_MIGRATION.sql, and the
-- column/constraint usage in lib/queries, app/api and lib/tmdb.ts. It has not
-- been diffed against a live introspection dump, so if you have psql access it
-- is worth confirming once.

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- SCHEMA
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS batchflix;

-- ---------------------------------------------------------------------------
-- GRANTS
-- Easy to forget on a rebuild: without these PostgREST cannot see the schema
-- and every request fails with a permission error before RLS is even
-- consulted. RLS is what actually restricts rows; these grants only expose the
-- schema to the API roles.
--
-- `anon` is included deliberately: public year in review share links are read
-- with the anon key (see app/share/year-in-review/[slug]/page.tsx).
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA batchflix TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA batchflix TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA batchflix TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA batchflix TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA batchflix
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA batchflix
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA batchflix
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- TABLE: media_items
-- Shared TMDB metadata cache. Written only by the service role; every user
-- reads the same rows.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batchflix.media_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tmdb_id integer NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title text NOT NULL,
  poster_path text,
  backdrop_path text,
  release_date date,
  runtime integer,
  genres jsonb DEFAULT '[]',
  overview text,
  director text,
  -- TV only: TMDB number_of_episodes, used for new season detection
  total_episodes integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tmdb_id, media_type)
);

ALTER TABLE batchflix.media_items
  ADD COLUMN IF NOT EXISTS total_episodes integer;

ALTER TABLE batchflix.media_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_items_select" ON batchflix.media_items;
CREATE POLICY "media_items_select" ON batchflix.media_items
  FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- TABLE: user_media
-- Personal library entries, one row per user per title.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batchflix.user_media (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES batchflix.media_items(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('watched', 'watching', 'watchlist')),
  rating smallint CHECK (rating >= 1 AND rating <= 10),
  watched_date date,
  notes text,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, media_id)
);

ALTER TABLE batchflix.user_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_media_select" ON batchflix.user_media;
CREATE POLICY "user_media_select" ON batchflix.user_media
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_media_insert" ON batchflix.user_media;
CREATE POLICY "user_media_insert" ON batchflix.user_media
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_media_update" ON batchflix.user_media;
CREATE POLICY "user_media_update" ON batchflix.user_media
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_media_delete" ON batchflix.user_media;
CREATE POLICY "user_media_delete" ON batchflix.user_media
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: lists
-- User-created collections. A list may nest one level via parent_list_id
-- (a sublist); the API rejects attaching a sublist to another sublist.
--
-- rules holds auto-behaviour objects, currently only
-- [{"type":"auto_remove_on_status","status":"watched"}].
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batchflix.lists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#2563EB',
  is_pinned boolean DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  parent_list_id uuid REFERENCES batchflix.lists(id) ON DELETE CASCADE,
  rules jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Added after the original schema shipped (see SUBLISTS_MIGRATION.sql)
ALTER TABLE batchflix.lists
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
ALTER TABLE batchflix.lists
  ADD COLUMN IF NOT EXISTS parent_list_id uuid
  REFERENCES batchflix.lists(id) ON DELETE CASCADE;
ALTER TABLE batchflix.lists
  ADD COLUMN IF NOT EXISTS rules jsonb NOT NULL DEFAULT '[]';

ALTER TABLE batchflix.lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lists_select" ON batchflix.lists;
CREATE POLICY "lists_select" ON batchflix.lists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lists_insert" ON batchflix.lists;
CREATE POLICY "lists_insert" ON batchflix.lists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lists_update" ON batchflix.lists;
CREATE POLICY "lists_update" ON batchflix.lists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lists_delete" ON batchflix.lists;
CREATE POLICY "lists_delete" ON batchflix.lists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: list_items
-- Membership of a title in a list, ordered by position.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batchflix.list_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id uuid NOT NULL REFERENCES batchflix.lists(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES batchflix.media_items(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE(list_id, media_id)
);

ALTER TABLE batchflix.list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "list_items_select" ON batchflix.list_items;
CREATE POLICY "list_items_select" ON batchflix.list_items
  FOR SELECT TO authenticated
  USING (auth.uid() = (SELECT user_id FROM batchflix.lists WHERE id = list_id));

DROP POLICY IF EXISTS "list_items_insert" ON batchflix.list_items;
CREATE POLICY "list_items_insert" ON batchflix.list_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = (SELECT user_id FROM batchflix.lists WHERE id = list_id));

DROP POLICY IF EXISTS "list_items_update" ON batchflix.list_items;
CREATE POLICY "list_items_update" ON batchflix.list_items
  FOR UPDATE TO authenticated
  USING (auth.uid() = (SELECT user_id FROM batchflix.lists WHERE id = list_id));

DROP POLICY IF EXISTS "list_items_delete" ON batchflix.list_items;
CREATE POLICY "list_items_delete" ON batchflix.list_items
  FOR DELETE TO authenticated
  USING (auth.uid() = (SELECT user_id FROM batchflix.lists WHERE id = list_id));

-- ---------------------------------------------------------------------------
-- TABLE: tv_progress
-- Per-episode watch state. A row exists only for an episode the user has
-- interacted with or that was bulk-tracked; absence means untracked, which is
-- what new season detection keys off. Unaired episodes must never get a
-- watched row (see lib/tmdb-episodes.ts).
--
-- Written both by the user's own session and by the service role during bulk
-- marking, so the owner policies below cover the former and the service role
-- bypasses RLS for the latter.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batchflix.tv_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES batchflix.media_items(id) ON DELETE CASCADE,
  season_number integer NOT NULL CHECK (season_number > 0),
  episode_number integer NOT NULL CHECK (episode_number > 0),
  watched boolean NOT NULL DEFAULT false,
  watched_date date,
  rating smallint CHECK (rating >= 1 AND rating <= 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Target of every upsert in the tv-progress routes
  UNIQUE(user_id, media_id, season_number, episode_number)
);

ALTER TABLE batchflix.tv_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tv_progress_select" ON batchflix.tv_progress;
CREATE POLICY "tv_progress_select" ON batchflix.tv_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tv_progress_insert" ON batchflix.tv_progress;
CREATE POLICY "tv_progress_insert" ON batchflix.tv_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tv_progress_update" ON batchflix.tv_progress;
CREATE POLICY "tv_progress_update" ON batchflix.tv_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tv_progress_delete" ON batchflix.tv_progress;
CREATE POLICY "tv_progress_delete" ON batchflix.tv_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: year_in_review_snapshots
-- Frozen year in review payloads behind a public share slug. `data` is the
-- serialised YearInReview object so a shared link keeps rendering even after
-- the underlying library changes.
--
-- NOTE the asymmetric policies: SELECT is open to anon because the share page
-- reads by slug with the anon key. Writes stay owner-only. Nothing sensitive
-- beyond the user's own watch summary lives here, and the slug is the secret.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batchflix.year_in_review_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  slug text NOT NULL UNIQUE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Target of the snapshot upsert: one snapshot per user per year
  UNIQUE(user_id, year)
);

ALTER TABLE batchflix.year_in_review_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "yir_snapshots_public_select" ON batchflix.year_in_review_snapshots;
CREATE POLICY "yir_snapshots_public_select" ON batchflix.year_in_review_snapshots
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "yir_snapshots_insert" ON batchflix.year_in_review_snapshots;
CREATE POLICY "yir_snapshots_insert" ON batchflix.year_in_review_snapshots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "yir_snapshots_update" ON batchflix.year_in_review_snapshots;
CREATE POLICY "yir_snapshots_update" ON batchflix.year_in_review_snapshots
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "yir_snapshots_delete" ON batchflix.year_in_review_snapshots;
CREATE POLICY "yir_snapshots_delete" ON batchflix.year_in_review_snapshots
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- FUNCTIONS AND TRIGGERS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION batchflix.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_media_items ON batchflix.media_items;
CREATE TRIGGER set_updated_at_media_items
  BEFORE UPDATE ON batchflix.media_items
  FOR EACH ROW EXECUTE FUNCTION batchflix.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_user_media ON batchflix.user_media;
CREATE TRIGGER set_updated_at_user_media
  BEFORE UPDATE ON batchflix.user_media
  FOR EACH ROW EXECUTE FUNCTION batchflix.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_lists ON batchflix.lists;
CREATE TRIGGER set_updated_at_lists
  BEFORE UPDATE ON batchflix.lists
  FOR EACH ROW EXECUTE FUNCTION batchflix.set_updated_at();

-- tv_progress and year_in_review_snapshots intentionally have no updated_at
-- trigger: the application writes updated_at explicitly on every upsert.

-- Creates a default Favorites list for every new user. The "Favorite Movies"
-- and "Favorite TV Shows" lists are created lazily by the app layout instead.
CREATE OR REPLACE FUNCTION public.handle_new_batchflix_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO batchflix.lists (user_id, name, is_pinned, color)
  VALUES (NEW.id, 'Favorites', true, '#2563EB');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_batchflix ON auth.users;
CREATE TRIGGER on_auth_user_created_batchflix
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_batchflix_user();

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_media_user_id
  ON batchflix.user_media(user_id);

CREATE INDEX IF NOT EXISTS idx_user_media_media_id
  ON batchflix.user_media(media_id);

CREATE INDEX IF NOT EXISTS idx_user_media_user_status
  ON batchflix.user_media(user_id, status);

-- Stats and year in review scan a watched_date range per user; the library
-- also sorts on it.
CREATE INDEX IF NOT EXISTS idx_user_media_user_watched_date
  ON batchflix.user_media(user_id, watched_date DESC);

CREATE INDEX IF NOT EXISTS idx_list_items_list_id
  ON batchflix.list_items(list_id);

-- getListById orders items by position within a list.
CREATE INDEX IF NOT EXISTS idx_list_items_list_position
  ON batchflix.list_items(list_id, position);

CREATE INDEX IF NOT EXISTS idx_media_items_tmdb
  ON batchflix.media_items(tmdb_id, media_type);

-- From SUBLISTS_MIGRATION.sql
CREATE INDEX IF NOT EXISTS lists_parent_list_id_idx
  ON batchflix.lists(parent_list_id);

CREATE INDEX IF NOT EXISTS idx_lists_user_id
  ON batchflix.lists(user_id);

-- The hottest lookup in the app: every library load, media detail render and
-- episode write filters on exactly this pair.
CREATE INDEX IF NOT EXISTS idx_tv_progress_user_media
  ON batchflix.tv_progress(user_id, media_id);

-- No separate index on year_in_review_snapshots(slug): the UNIQUE constraint
-- on that column already provides one, which is what the share page lookup
-- uses.
