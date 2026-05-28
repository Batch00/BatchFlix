# BatchFlix

Personal movie and TV tracker. Part of the [Batch Apps](https://batch-apps.com) suite, hosted at [batchflix.batch-apps.com](https://batchflix.batch-apps.com).

## Stack

- **Next.js 15** (App Router, TypeScript)
- **shadcn/ui** + Tailwind CSS
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

Run the database schema against your Supabase project (SQL editor or CLI):

```bash
psql "$DATABASE_URL" -f supabase/schema.sql
```

Start the dev server:

```bash
npm run dev
```

## Deploy

1. Push to GitHub and import the repo in [Vercel](https://vercel.com)
2. Set all environment variables from the table above
3. Set `NEXT_PUBLIC_APP_URL` to `https://batchflix.batch-apps.com`
4. Set custom domain to `batchflix.batch-apps.com`
