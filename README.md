# ✈️ Flight Scanner (personal)

A local web app that searches flights across all airlines (Google Flights data via SerpApi), ranks them by
**Cheapest / Fastest / Best value** using the **true total cost** (fare + estimated checked-bag and card fees),
and sends you to the **airline's own site** (or an agency) to pay. It never takes payment itself.

---

## 1. Start the app (everyday use)

Open **Terminal** and run:

```bash
cd ~/Tharun_Cert_Practice_Project
npm run dev
```

Wait for `✓ Ready`, then open **http://localhost:3000** in your browser.

- Keep the Terminal window open while you use the app.
- **Stop the app:** click the Terminal window and press `Ctrl + C`.
- The header shows **"N API searches left"** when your real key is working, or **"Demo mode"** if it isn't.

---

## 2. First-time setup (only once, already done on this Mac)

```bash
cd ~/Tharun_Cert_Practice_Project
npm install --cache /tmp/npm-cache     # install libraries (see "npm cache note" below)
cp .env.local.example .env.local       # create your private settings file
open -e .env.local                     # paste your key after SERPAPI_KEY= and save
```

Get a free key at https://serpapi.com (Dashboard → API key). Without a key the app runs in **demo mode**
with sample data.

`.env.local` holds your secret key. It is git-ignored, so don't share or commit it.

---

## 3. After a code change: how to "deploy" it

### a) While `npm run dev` is running
Most changes show up **automatically**. Save the file and the browser refreshes by itself.
You must **restart** (`Ctrl + C`, then `npm run dev`) when you:
- change `.env.local` (e.g. a new API key),
- install or update packages (`npm install …`),
- change `next.config.ts`.

### b) Check the change before relying on it
Run these in the project folder. All three should finish without errors:

```bash
npm test          # unit tests (scoring, fees, parsing, visa warnings)
npm run lint      # code style / common mistakes
npm run build     # full production build (catches type errors)
```

Then open http://localhost:3000 and do one search to confirm it works.
Tip: set `MOCK=1` in `.env.local` while testing UI changes so you don't use API quota (set back to `MOCK=0` after,
then restart).

### c) Run the faster "production" version locally (optional)
`npm run dev` is fine for personal use. For the optimised version:

```bash
npm run build
npm start          # serves http://localhost:3000
```

With `npm start` you must **re-run `npm run build` and `npm start` after every code change**. It does not auto-reload.

### d) Quick reference

| What changed                     | What to do                                         |
|----------------------------------|----------------------------------------------------|
| Code in `app/`, `components/`, `lib/` | Nothing (dev mode auto-reloads); run `npm test`  |
| `.env.local` (key, MOCK, FX rate)| Restart: `Ctrl + C`, `npm run dev`                 |
| `package.json` / new library     | `npm install --cache /tmp/npm-cache`, then restart |
| Using `npm start` (production)   | `npm run build` then `npm start` again             |

---

## 4. Deploying online (optional, for use from your phone)

The app currently runs **only on your Mac**. It can be hosted for free on **Vercel**:

```bash
cd ~/Tharun_Cert_Practice_Project
npx vercel login                        # one-time
npx vercel link                         # one-time: create the project
npx vercel env add SERPAPI_KEY production   # paste your key when asked (one-time)
npx vercel --prod                       # deploy; re-run this after every code change
```

⚠️ **Before deploying online, add a password.** Anyone who finds the URL could use up your SerpApi searches.
This is **not set up yet**, so ask Claude to "add a login/password to the flight scanner" first.

After each code change: run the checks in step 3b, then `npx vercel --prod`.

---

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| `localhost:3000` doesn't open | The app isn't running. Run `npm run dev` (section 1). |
| "Port 3000 is in use" | Another copy is running. Close it, or run `lsof -ti :3000 \| xargs kill`, then start again. |
| Header shows "Demo mode" | `SERPAPI_KEY` missing in `.env.local`, or `MOCK=1`. Fix and restart. |
| "Search quota exhausted" | Free monthly searches are used up. Wait for the monthly reset or upgrade on serpapi.com. |
| `npm install` fails with EACCES / permission error | See the npm cache note below. |

### npm cache note
Your `~/.npm` folder has files owned by root, which makes plain `npm install` fail. Either keep using
`--cache /tmp/npm-cache`, or fix it once with: `sudo chown -R $(id -u):$(id -g) ~/.npm`

---

## How searches use quota
- One-way: 1 search. Return: 1 search + 1 when you pick the departing flight.
- "Book →" (booking links): 1 search.
- Flexible dates ±N: 2N extra searches.
- Identical searches within 30 minutes are cached and free (cache resets when the app restarts).

## How "true cost" works
- If Google says *"Checked baggage for a fee"*, or the airline usually sells bags separately (Scoot, AirAsia, Jetstar…)
  and Google gives no bag info, an estimated bag price from `lib/airline-fees.ts` is added per person, per direction.
  Indian carriers (IndiGo, Air India Express, SpiceJet, Akasa) usually include a bag on international fares, so they're
  only charged when Google says so. Untick "I need one" to skip bag fees entirely.
- Budget-carrier card/convenience fees are estimated from the same file.
- **Best value** = true total + (trip hours × "my time is worth") + small penalties for self-transfer,
  overnight layovers and airport changes.
- The card price can be an agency's price. The "Book →" list shows the airline-direct price too, so compare before paying.

Update `lib/airline-fees.ts` whenever you see real prices at checkout. The estimates get better as you do.

## Visa reminders (Indian passport)
`lib/transit-visa.ts` flags layovers in countries that commonly need a transit visa (UK, US, Canada,
Australia, Schengen), airport changes and self-transfer itineraries. Rules change, so always verify before booking.

## Project layout
- `app/page.tsx`: main UI (search → choose departing → choose return → book)
- `app/api/*`: server routes (your API key never reaches the browser)
- `lib/serpapi.ts`: SerpApi client + 30 min cache; `lib/normalise.ts` parses responses
- `lib/scoring.ts`: true cost and ranking; `lib/airline-fees.ts`: fee estimates; `lib/mock.ts`: demo data
- `components/`: search form, result card, booking list, date strip
- `tests/`: `npm test`
