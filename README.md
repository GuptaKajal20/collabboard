# Collab Pro

Free platform for influencers and content creators in India: discover brand collaboration openings every day and build a shareable portfolio.

## What's where

| Path | What it is |
| --- | --- |
| `/` and the other website pages | Generated from `site/content.mjs` by `site/build.mjs`; styles in `site.css`, behaviour in `site.js` |
| `/signup`, `/signin`, `/forgot-password`, `/reset-password` | Account pages (`site-auth.js`), kept out of search |
| `/app` | The creator app (`app.html`, `app.js`, `styles.css`) |
| `/p/<name>` | Public portfolio pages (`p.html`, `portfolio.js`, `portfolio.css`) |
| `scripts/fetch-listings.mjs` | Daily search for collaboration openings (GitHub Action, Tavily) |
| `supabase-setup.sql` | Database, storage and security rules. Safe to run again. |

## Update the website

1. Edit `site/content.mjs` (features, FAQs, steps, menus, site URL, GA4 ID, Search Console code).
2. Run `npm run site` to regenerate the pages, `sitemap.xml`, `robots.txt` and `cp-config.js`.
3. Commit and push. Vercel deploys automatically.

## Run locally

```bash
npm run serve          # http://localhost:8766 (clean URLs like Vercel)
```

Open `http://localhost:8766/app?offline` to try the app without an account.

## Analytics and Search Console

- Put the GA4 measurement ID in `SITE.ga4Id` and rebuild. Analytics loads only after a visitor accepts the cookie notice.
- Tracked events: `sign_up_click`, `sign_up`, `login`, `profile_complete`, `collab_apply`, `portfolio_publish`, `contact_submit`.
- For Search Console, add the HTML-tag verification code to `SITE.searchConsoleVerification`, rebuild, verify, then submit `/sitemap.xml`.
