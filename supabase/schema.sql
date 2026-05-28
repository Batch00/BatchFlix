-- BatchFlix database schema
-- Run against the shared Batch Apps Supabase project

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SCHEMA
CREATE SCHEMA IF NOT EXISTS batchflix;

-- TABLE: media_items
-- Shared TMDB metadata cache; populated by the service role
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tmdb_id, media_type)
);

ALTER TABLE batchflix.media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_items_select" ON batchflix.media_items
  FOR SELECT TO authenticated USING (true);

-- TABLE: user_media
-- Personal library entries per user
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

CREATE POLICY "user_media_select" ON batchflix.user_media
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_media_insert" ON batchflix.user_media
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_media_update" ON batchflix.user_media
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_media_delete" ON batchflix.user_media
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- TABLE: lists
-- User-created collections
CREATE TABLE IF NOT EXISTS batchflix.lists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#2563EB',
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE batchflix.lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lists_select" ON batchflix.lists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "lists_insert" ON batchflix.lists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lists_update" ON batchflix.lists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "lists_delete" ON batchflix.lists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- TABLE: list_items
-- Items within a list
CREATE TABLE IF NOT EXISTS batchflix.list_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id uuid NOT NULL REFERENCES batchflix.lists(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES batchflix.media_items(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE(list_id, media_id)
);

ALTER TABLE batchflix.list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "list_items_select" ON batchflix.list_items
  FOR SELECT TO authenticated
  USING (auth.uid() = (SELECT user_id FROM batchflix.lists WHERE id = list_id));

CREATE POLICY "list_items_insert" ON batchflix.list_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = (SELECT user_id FROM batchflix.lists WHERE id = list_id));

CREATE POLICY "list_items_update" ON batchflix.list_items
  FOR UPDATE TO authenticated
  USING (auth.uid() = (SELECT user_id FROM batchflix.lists WHERE id = list_id));

CREATE POLICY "list_items_delete" ON batchflix.list_items
  FOR DELETE TO authenticated
  USING (auth.uid() = (SELECT user_id FROM batchflix.lists WHERE id = list_id));

-- FUNCTION: set_updated_at
CREATE OR REPLACE FUNCTION batchflix.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_media_items
  BEFORE UPDATE ON batchflix.media_items
  FOR EACH ROW EXECUTE FUNCTION batchflix.set_updated_at();

CREATE TRIGGER set_updated_at_user_media
  BEFORE UPDATE ON batchflix.user_media
  FOR EACH ROW EXECUTE FUNCTION batchflix.set_updated_at();

CREATE TRIGGER set_updated_at_lists
  BEFORE UPDATE ON batchflix.lists
  FOR EACH ROW EXECUTE FUNCTION batchflix.set_updated_at();

-- FUNCTION: handle_new_user
-- Creates a default Favorites list for every new user
CREATE OR REPLACE FUNCTION public.handle_new_batchflix_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO batchflix.lists (user_id, name, is_pinned, color)
  VALUES (NEW.id, 'Favorites', true, '#2563EB');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_batchflix
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_batchflix_user();

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_user_media_user_id
  ON batchflix.user_media(user_id);

CREATE INDEX IF NOT EXISTS idx_user_media_media_id
  ON batchflix.user_media(media_id);

CREATE INDEX IF NOT EXISTS idx_user_media_user_status
  ON batchflix.user_media(user_id, status);

CREATE INDEX IF NOT EXISTS idx_list_items_list_id
  ON batchflix.list_items(list_id);

CREATE INDEX IF NOT EXISTS idx_media_items_tmdb
  ON batchflix.media_items(tmdb_id, media_type);
