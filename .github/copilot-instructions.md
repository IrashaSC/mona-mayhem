# Mona Mayhem Project Guidelines

## Project Scope
- Prioritize application work under `src/` for feature implementation.
- Treat `workshop/` as curriculum content and `docs/` as the static workshop site; only edit those when the task is documentation/workshop related.
- For workshop context and learning flow, see [README.md](../README.md) and the linked files in `workshop/`.

## Build And Run
- Install dependencies: `npm install`
- Start local dev server: `npm run dev`
- Build for production: `npm run build`
- Preview production build: `npm run preview`
- There is currently no dedicated `test` or `lint` script in `package.json`; use `npm run build` as the primary validation step.

## Architecture
- Framework: Astro v5 with Node adapter in standalone server mode (see `astro.config.mjs`).
- Main page entrypoint: `src/pages/index.astro`
- Server API route: `src/pages/api/contributions/[username].ts`
  - This dynamic route is server-side (`prerender = false`) and should proxy GitHub contribution data.
  - Expected upstream endpoint pattern: `https://github.com/{username}.contribs`

## Conventions
- Keep API route handlers typed with Astro types (`APIRoute`) and return explicit HTTP status codes with JSON content-type headers.
- Keep browser interaction logic for the app page in `index.astro` unless extracting reusable modules is clearly beneficial.
- Preserve existing formatting/style in touched files (the repo currently uses a mix of tabs/spaces depending on file).
- Avoid introducing new dependencies unless necessary; prefer platform APIs and Astro defaults.

## Common Pitfalls
- If route or frontend updates do not appear during local development, restart the dev server.
- Keep changes aligned with the current project stage: this repository starts as a scaffold, so some app behavior is intentionally incomplete until implemented.

## Related Docs
- Project overview and workshop structure: [README.md](../README.md)
- Step-by-step implementation guidance: `workshop/00-overview.md` through `workshop/06-bonus.md`
- Hosted workshop UI source files: `docs/index.html` and `docs/step.html`