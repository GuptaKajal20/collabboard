# CollabBoard

A free board of brand collaboration opportunities for Indian creators. Every morning a script searches the web (Tavily Search API), removes scams, junk and old posts, tags each result, and saves `data/listings.json`. The website reads that file. No login, no database, no admin.

## Files

| File | What it does |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The website: filters, cards, Apply button |
| `scripts/fetch-listings.mjs` | Searches, cleans and tags listings |
| `data/listings.json` | The listings the website shows |
| `.github/workflows/fetch-listings.yml` | Runs the script every day at 7:00 IST |

## Go live (about 20 minutes)

1. **Get a Tavily key:** sign up free at https://tavily.com (no card needed) and copy your API key.
2. **Put the code on GitHub:** create a new repository and upload this `collabboard` folder.
3. **Add the key:** in the repository, go to Settings → Secrets and variables → Actions → New repository secret. Name it `TAVILY_API_KEY` and paste the key.
4. **Fill it for the first time:** go to the Actions tab → "Fetch listings" → Run workflow.
5. **Publish the site:** sign in to https://vercel.com (or Netlify) with GitHub, import the repository, and deploy. No settings needed. Every daily update redeploys the site automatically.

## Run on your computer

```bash
npm test                                # offline test with sample data
python3 -m http.server 8080             # then open http://localhost:8080/?test=1
TAVILY_API_KEY=your_key npm run fetch    # real search, updates data/listings.json
```

## Change what it finds

Edit the lists at the top of `scripts/fetch-listings.mjs`: `QUERIES` (what to search), `SCAM_WORDS` and `NOISE_WORDS` (what to drop), and `NICHES` (how listings are tagged).
