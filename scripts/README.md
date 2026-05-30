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
