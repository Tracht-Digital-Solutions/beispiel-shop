# BLOCK/01 implementation guide

This repository is a static Astro / React demo storefront, with complete German and English content. It must never place real orders or collect payments. The same demo behavior applies to every build channel.

- `main` is the source branch. `dev` and `release` are generated artifact branches; never hand-edit them. Release is manual; do not invoke a deployment webhook unless the user requests deployment.
- Product and variant IDs in `src/lib/catalog.ts` are stable persistence keys. Prices are integer euro cents; shipping settings live in `src/lib/config.ts`.
- All translated UI and product content must work in both locales. Shared cart state must survive locale changes and handle unavailable or full storage.
- Images and fonts are served locally. Maintain `docs/IMAGE-SOURCES.md` and font license notices when changing assets.
- Run `npm run type-check`, `npm run test:run`, `npm run build`, and `npm run test:e2e` before publishing source changes. Test the static build, not only the development server.
- Optional `PUBLIC_SITE_URL` configures the deployment origin at build time. Hosting assumes the root of a domain or subdomain; no SPA fallback or application server is needed.
