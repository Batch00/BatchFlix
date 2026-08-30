# BatchFlix Import Scripts

## import-history.ts

Imports a historical watch list from a CSV file into BatchFlix.

### Setup

Install script dependencies (one-time):

```bash
npm install --save-dev ts-node csv-parse dotenv
```

### CSV Format

Create `scripts/import-data.csv` with the following columns (header row required):

```
title,year,type,rating,watched_date,notes
The Godfather,1972,movie,10,2024-01-15,Masterpiece
Breaking Bad,2008,tv,9,,
```

Column details:
- `title` -- required. Movie or show title.
- `year` -- optional. Release year (helps disambiguation).
- `type` -- optional. `movie` or `tv`. Used as a hint only.
- `rating` -- optional. Numeric rating. Auto-detected as 0-5 or 0-10 scale.
- `watched_date` -- optional. ISO date (YYYY-MM-DD).
- `notes` -- optional. Personal notes.

### Running

```bash
npx ts-node scripts/import-history.ts
```

The script:
1. Reads `.env.local` for API keys
2. Searches TMDB for each row to find the best match
3. Upserts each item into the batchflix database
4. Writes unmatched items to `scripts/skipped.log`
5. Prints a summary at the end

### Notes

- Imports for the first user in your Supabase project by default.
- All imported items are set to `watched` status.
- Ratings are auto-scaled to 1-10 (the internal storage format).
- The script adds a 200ms delay between TMDB API calls to respect rate limits.
- Running the script multiple times is safe -- items are upserted, not duplicated.

## backfill-season-stats.ts

Populates `media_items.season_stats` for every TV show in the database.

`season_stats` holds per-season air dates and aired episode counts. The library
reads it to size progress bars and to decide the NEW SEASON and COMING SOON
badges, and the nightly cron at `/api/cron/refresh-season-stats` uses it to
decide which shows to re-check. A show only gets the column written when its
media detail page loads, so a library imported from CSV starts out mostly empty
and the cron has nothing to work from.

### Running

```bash
npx tsx scripts/backfill-season-stats.ts
```

Use `tsx`, not `ts-node`: this script imports `buildSeasonStats` from the app's
`lib/` through the `@/` path alias, which ts-node does not resolve.

### When to run it

- Once after deploying `season_stats`, to seed the whole library at once.
- After a bulk import that added TV shows.
- Otherwise never. The detail page and the nightly cron keep the column current,
  so this is a seeding tool rather than routine maintenance.

### Notes

- Safe to re-run. Each show is rewritten from TMDB, so the result does not
  depend on what was stored before.
- Roughly two TMDB calls per show (the show, then its latest aired season) with
  a 250ms delay between shows.
- Shows whose TMDB lookup fails are counted as skipped and left untouched,
  never blanked.
