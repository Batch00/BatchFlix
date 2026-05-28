# BatchFlix

Personal movie and TV tracker. Part of the Batch Apps suite at batchflix.batch-apps.com.

## Stack
- Next.js (App Router) + TypeScript
- shadcn/ui + Tailwind CSS
- Supabase (shared Batch Apps project, batchflix schema)
- Recharts
- Vercel hosting

## Design
- Dark minimal aesthetic, black/near-black backgrounds
- Electric blue accent (#3B82F6)
- Inter font
- No em dashes anywhere in code or copy

## Key conventions
- All Supabase tables live in the batchflix schema, not public
- TMDB API calls go through Next.js API routes only, never client-side
- Use Next.js Image component for all TMDB poster/backdrop images
- Environment variables in .env.local (keys documented, no values committed)

## Architecture
- /app - Next.js App Router pages
- /components - shared UI components
- /lib - Supabase client, TMDB helpers, utilities
- /supabase/migrations - versioned SQL migration files

## Behavioral Guidelines

1. **Think Before Coding** - State assumptions explicitly before implementing. If multiple interpretations exist, present them. If a simpler approach exists, say so. If something is unclear, stop and ask.

2. **Simplicity First** - Write the minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code. No speculative flexibility or configurability. If you write 200 lines and it could be 50, rewrite it.

3. **Surgical Changes** - Touch only what you must. Do not improve adjacent code that was not asked about. Do not refactor things that are not broken. Match existing style even if you would do it differently. If you notice unrelated dead code, mention it but do not delete it. Remove imports/variables/functions that YOUR changes made unused - do not remove pre-existing dead code unless asked. Every changed line should trace directly to the user's request.

4. **Goal-Driven Execution** - Transform tasks into verifiable goals. For multi-step tasks, state a brief plan with verify steps. Strong success criteria let you loop independently. Clarifying questions should come before implementation.