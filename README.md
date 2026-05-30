# BatchFlix

Personal movie and TV tracker. Part of the [Batch Apps](https://batch-apps.com) suite, hosted at [batchflix.batch-apps.com](https://batchflix.batch-apps.com).

## Features

- **Library** -- track movies and TV shows with statuses: Watchlist, Watching, Watched
- **Search** -- search TMDB and add items in seconds (Cmd+K)
- **Ratings** -- 5-star ratings, watched dates, and personal notes
- **Lists** -- create custom collections with drag-to-reorder
- **Favorites** -- heart any item to add it to your Favorites list
- **Stats** -- genre breakdown, decade chart, rating distribution, monthly heatmap, top rated
- **Onboarding** -- guided setup for new users

## Stack

- **Next.js 16** (App Router, TypeScript)
- **shadcn/ui** + Tailwind CSS v4
- **Supabase** (shared Batch Apps project, `batchflix` schema)
- **TMDB API** (proxied through `/api/tmdb`)
- **Resend** (transactional email)
- **TanStack Query**, Recharts, date-fns
- **Vercel** hosting

## Environment Variables

| Key | Description | Where to get it |
|-----|-------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | supabase.com dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | supabase.com dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | supabase.com dashboard |
| `TMDB_BEARER_TOKEN` | TMDB API Read Access Token | themoviedb.org > Settings > API |
| `RESEND_API_KEY` | Resend API key | resend.com dashboard |
| `NEXT_PUBLIC_APP_URL` | Full app URL (no trailing slash) | `http://localhost:3000` locally |
| `BATCHFLIX_ADMIN_EMAIL` | Where access request emails are sent | Your email |
| `APPROVAL_SECRET` | HMAC secret for signing approval tokens | `openssl rand -hex 32` |

## Local Setup

```bash
git clone <repo>
cd batchflix
npm install
cp .env.example .env.local
# fill in .env.local values
```

Run the database schema against your Supabase project:

```bash
psql "$DATABASE_URL" -f supabase/schema.sql
```

Start the dev server:

```bash
npm run dev
```

## Scripts

See [scripts/README.md](scripts/README.md) for details on the import script.

```bash
# Import historical watch history from a CSV file
npx ts-node scripts/import-history.ts
```

## Schema

All tables live in the `batchflix` schema in Supabase (not `public`). See [supabase/schema.sql](supabase/schema.sql) for the full schema definition.

Key tables:
- `batchflix.media_items` -- canonical TMDB metadata cache
- `batchflix.user_media` -- per-user watch status, ratings, notes
- `batchflix.lists` -- user-created collections
- `batchflix.list_items` -- items in each list with ordering

## Deploy

1. Push to GitHub and import the repo in [Vercel](https://vercel.com)
2. Set all environment variables from the table above
3. Set `NEXT_PUBLIC_APP_URL` to `https://batchflix.batch-apps.com`
4. Set custom domain to `batchflix.batch-apps.com`
