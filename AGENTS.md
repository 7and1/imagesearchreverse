# Repository Guidelines

## Project Structure & Module Organization

- `src/app/` holds Next.js App Router routes, layouts, and metadata (e.g., `page.tsx`, `layout.tsx`, `sitemap.ts`, `robots.ts`).
- `src/app/api/` contains Edge API routes like `search` and `upload`.
- `src/components/` contains shared UI components (e.g., `search-panel.tsx`).
- `src/lib/` hosts server-side helpers (DataForSEO client, rate limiting, Cloudflare env), with unit tests in `*.test.ts` (e.g., `src/lib/rate-limit.test.ts`).
- `public/` stores static assets.
- Root config files include `next.config.ts`, `wrangler.toml`, `vitest.config.ts`, `eslint.config.mjs`, and `tsconfig.json`.

## Build, Test, and Development Commands

- `npm run dev` — start the Next.js dev server (uses the Cloudflare dev platform shim in `next.config.ts`).
- `npm run build` — create a production build.
- `npm run start` — serve the production build locally.
- `npm run pages:build` — build for Cloudflare Pages via `@cloudflare/next-on-pages`.
- `npm run deploy` — build and deploy `.vercel/output/static` to Pages.
- `npm run lint` — run ESLint (Next core-web-vitals + TypeScript rules).
- `npm run test` — run Vitest unit tests.
- `npm run typecheck` — run TypeScript strict checks with no emit.

## Coding Style & Naming Conventions

- TypeScript + React (Next App Router); `tsconfig.json` is `strict: true`.
- Match existing formatting: 2-space indentation, double quotes, semicolons.
- Filenames use kebab-case (e.g., `search-panel.tsx`); React components use PascalCase.
- Import via the `@/*` alias for `src/*` (e.g., `@/lib/rate-limit`).
- Styling is Tailwind-first with shared rules in `src/app/globals.css`.

## Testing Guidelines

- Framework: Vitest (`describe`/`it`/`expect`).
- Place unit tests next to helpers in `src/lib` using `*.test.ts`.
- No coverage thresholds are configured; add tests for new helper logic or API utilities.

## Commit & Pull Request Guidelines

- Git history currently has a single “Initial commit…” entry, so no established convention.
- Use short, imperative commit subjects (e.g., “Add search request validation”) until a standard is defined.
- PRs should include a brief summary, test commands run, and screenshots for UI changes; mention Cloudflare binding or env var changes.

## Security & Configuration Notes

- Cloudflare bindings are defined in `wrangler.toml` (`KV_RATE_LIMIT`, `R2_BUCKET`); keep IDs and secrets out of the repo.
- DataForSEO and public R2 settings should live in `.env.local` or Cloudflare Pages environment variables, not in code.
