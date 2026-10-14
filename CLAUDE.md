# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Personal project — the BSOC design system never applies

`posicion-financiera` is Tomás's private family finance app, not a Barcelona School of Creativity tool. The BSOC brand rules in the parent folder's `CLAUDE.md` (black/white/yellow palette, zero border-radius, United Sans, no emoji, textures…) **never** apply here: not for new components, not for refactors, not as a "consistency" fix. Keep the app's own look, described under Styling below.

## Commands

```bash
npm run dev      # Dev server on localhost:3000
npm run build    # Production build (also type-checks)
npm run lint     # ESLint (flat config, eslint-config-next)
npx tsc --noEmit # Type-check only — run before every commit
```

There is no test suite and no test runner installed. Verification = `npx tsc --noEmit` + `npm run lint` + clicking through the affected tab in `npm run dev`.

Deploy: `git push` → Vercel auto-deploys from `main`. No manual deploy step.

`AGENTS.md` carries one rule worth honouring: this is **Next.js 16**, whose App Router APIs and conventions differ from older training data. Check `node_modules/next/dist/docs/` before writing anything framework-level.

## Architecture

Next.js 16 App Router + TypeScript + Firebase/Firestore, deployed on Vercel. Everything is client-side React (`'use client'`) except the `app/api/*` route handlers.

### Data flow

A single Firestore document `shared/familia-ferrandiz` holds all state for all users. Tomás and Susana read/write the same document — there is **no per-user isolation**. The `_uid` argument in every `lib/firestore.ts` function is ignored on purpose; it only exists so call sites read naturally.

```
Firestore (shared/familia-ferrandiz)
  └── useUserData hook (hooks/useUserData.ts)
        └── Dashboard.tsx  ← single root component, owns all state
              ├── passes data + setters as props to each tab
              └── every setter auto-saves to Firestore on call
```

`useUserData` exposes async setters (`setFunds`, `setChildren`, …) that update React state and persist to Firestore in the same call. Tab components receive them as `onSave*` props and never touch Firestore directly. On first load, defaults from `lib/defaults.ts` are written to Firestore only if `remote.funds` is absent; each slice is otherwise adopted only when non-empty (`if (remote.history?.length)`), so an intentionally emptied array falls back to the default on the next reload.

Because the document is live family data with real balances, changing a field name or shape in `lib/types.ts` silently orphans whatever is already stored. Migrate (as `HijosTab` does) rather than rename.

**The real portfolio is only in Firestore.** `lib/defaults.ts` is a seed snapshot from May 2026: funds added later through the UI (e.g. Horos Value Internacional) and every current amount exist only in the database, never in the code or git history. Don't infer what Tomás holds from `defaults.ts` — ask, or work from data he provides.

### Key files

| File | Purpose |
|------|---------|
| `lib/types.ts` | All interfaces (`Fund`, `Child`, `RecurringContribution`, …). Fund fields are terse: `m` = market value, `inv` = invested capital, `r` = return %. `Fund.broker` (optional) is where the fund is held; `Broker` reuses the `Cuentas` keys (`myinvestor`, `caixabank`, `traderepublic`, `arquia`). |
| `lib/defaults.ts` | Seed fund/child/history data (May 2026 figures) for first load and migration, plus `SUGGESTED_BROKERS` (ISIN → bank, pre-fills the bank dropdown) |
| `lib/firestore.ts` | Every Firestore read/write — one `setDoc(..., { merge: true })` per slice |
| `lib/styles.ts` | Shared inline-style constants (`S.card`, `S.inp`, `S.btn`, `subTabBtn`, `thStyle`…) — use these instead of duplicating styles |
| `lib/utils.ts` | `fmt` / `fmt2` / `fmtPct` (es-ES), `todayStr()` (DD/MM/YYYY), `todayISO()` (YYYY-MM-DD), `COLORS_INV`, `TYPE_LABELS`, `TYPE_COLORS`, `SOURCE_LABELS` |
| `lib/tickers.ts` | The one ISIN → Yahoo ticker map (`YAHOO_TICKERS`), shared by both market routes, plus `findYahooTicker()` and `hasPublicPrice()` |
| `lib/pricing.ts` | Reference-price valuation (`applyQuote`, `markManual`, `MAX_JUMP`) — see "Price updates" |
| `lib/captura.ts` / `lib/captura-check.ts` | Screenshot importer: browser side (image prep, `applyCapture`) / server side (`checkCaptureRows`) — see "Screenshot importer" |
| `hooks/useUserData.ts` | Loads from Firestore on auth, exposes typed async setters, `loaded` flag |
| `contexts/AuthContext.tsx` | Google Sign-In + hardcoded email allowlist |
| `components/Dashboard.tsx` | Root: auth gate, header (snapshot + price update), tab routing, AportacionesBanner |

### Styling

Own visual language (see the rule at the top — never BSOC): a private dark dashboard with background `#0a0f1e`, cards `#111827`, borders `#1f2937`, accent blue `#3b82f6`, DM Sans, rounded corners, gradient buttons.

All styling is **inline `style={}` objects**, centralised in `lib/styles.ts`. Tailwind v4 is installed and `globals.css` imports it, but no component uses `className` for layout — don't introduce Tailwind classes into a component unless you're converting it deliberately.

### Charts

`chart.js` and `react-chartjs-2` are in `package.json` but **never imported**. Both `components/shared/Charts.tsx` and `components/inversiones/FundChart.tsx` inject Chart.js 4.4.1 from cdnjs into `window.Chart` (script id `chartjs`) and build charts imperatively against a canvas ref. Follow that pattern for new charts, or migrate the lot — but don't mix the two approaches.

### Tab components

Each tab lives in `components/<name>/<Name>Tab.tsx`:

- **PatrimonioTab** — net worth overview (accounts + investments + real estate − debt)
- **InversionesTab** — fund table with P&L, price dates, expandable `FundChart`
- **EvolucionTab** — historical patrimony chart + children evolution
- **HijosTab** — Simón and Félix: Imagine Bank accounts + Indexa Capital (Vanguard funds)
- **OperativaTab** — sub-tabs: trade log, alerts, transfer simulator, scheduled contributions. Registering a buy/sale/transfer also mutates the real fund values in the portfolio, and a buy into a new fund appends it to `funds`.
- **NoticiasTab** — RSS headlines from `/api/news` + Claude analysis from `/api/claude`
- **ExplorarTab** — sub-tabs: MyInvestor AI screener (`/api/explorar`) + Morningstar screener (`MorningstarTab` → `/api/morningstar`)

### API routes (`app/api/`)

| Route | Description |
|-------|-------------|
| `market/route.ts` | POST. Current **price per unit** for each ISIN, Yahoo Finance only, as a `PriceQuote` (`lib/types.ts`): `price`, real `date` of that price, `key` (`'yahoo:TICKER'`), `stale` (> 10 days old) and a `note` when there is no price. Pension plans (`type: 'PP'`, `N5459`) return "sin precio público". Morningstar was dropped: its screener API now answers with an HTML error page. |
| `market/history/route.ts` | GET `?isin=&type=&period=` (`1d`/`1m`/`3m`/`6m`/`1y`/`5y`). Price series for `FundChart`. Order: `YAHOO_TICKERS` → Yahoo search by ISIN → Morningstar timeseries (dead in practice; exact-ISIN match only). |
| `morningstar/route.ts` | POST. Claude Haiku (`claude-haiku-4-5-20251001`) returns structured fund metadata as JSON from model knowledge — not a real Morningstar query, which Cloudflare blocks. Enriched with Yahoo 1Y prices. `MorningstarTab` links out via a Google `site:morningstar.es` search, because constructed Morningstar URLs 404. |
| `news/route.ts` | GET. **No Claude, no API key** — fetches 11 financial RSS feeds (Bloomberg, Reuters, FT, Expansión, Cinco Días, Rankia…), scores each item against a `KEYWORDS` list built from Tomás's holdings, dedupes by title prefix and returns the top 20. |
| `claude/route.ts` | POST with `type`: `auto_resumen` (daily portfolio + news briefing), `portfolio` (full analysis), `news_impact`. Model `claude-opus-4-5`. All prompts are in Spanish and address Tomás directly. |
| `captura/route.ts` | POST `{ images, funds }`. Claude Sonnet 5.5 (`claude-sonnet-5-5`, effort `medium`) reads bank screenshots with structured outputs (`output_config.format` JSON schema, no zod) and returns `CaptureRow[]` after `checkCaptureRows()`. `maxDuration = 120`. Never writes anything. |
| `explorar/route.ts` | POST. Claude (`claude-opus-4-5`) with the **MyInvestor remote MCP server** (`https://mcp.myinvestor.es/mcp`, beta `mcp-client-2025-04-04`) so it can search the real ~2.300-fund catalogue. Regex-extracts name+ISIN pairs from the reply so the UI can offer "add to portfolio". |

### Price updates (the `⟳ Precios` button)

Valuation uses a **reference price** (`lib/pricing.ts`). Each fund/child fund stores `refPrice` (the unit price it was last valued at) and `priceKey` (which ticker that price came from). On each press: `m = m × (newPrice / refPrice)`, then `refPrice = newPrice`. So pressing twice changes nothing and pressing after a week captures the whole week. (Until Oct 2026 it applied the day's `changePercent` instead, which compounded on repeat presses and dropped every day but the last.)

- No `refPrice`, or `priceKey` changed (new ticker) → **calibrate**: store the reference, leave `m` alone.
- A move over `MAX_JUMP` (±15 %) since the reference → listed in a `confirm()`; skipped unless accepted.
- Setting `m` by hand (`ModalesGlobales`, `HijosTab`) calls `markManual()`, which deletes the reference and sets `priceSource: 'manual'`. Operativa and AportacionesBanner add money to `m` but keep the reference.
- Quotes are matched **by ISIN** and fetched once per ISIN (both children hold the same Vanguard funds). Warnings for stale or missing prices show under the button.
- **Firestore rejects `undefined` field values** — that is why `markManual` deletes keys instead of setting them to `undefined`, and why `applyQuote` only sets `lastPriceDate` when the quote has a date.

If a fund stops moving, check its ticker in `lib/tickers.ts` first: verify it on Yahoo (fresh `regularMarketTime`, EUR currency). The Inversiones tab paints price dates older than 10 days in amber.

### Screenshot importer (`📷 Captura` button)

`components/modales/ModalCaptura.tsx` → `/api/captura` → review screen → `applyCapture()`. Nothing is saved until Tomás ticks rows and presses "Aplicar".

- **Supported screens**: MyInvestor fund list and pension-plan screen, CaixaBank "Mis fondos", Trade Republic "Tu cartera". The system prompt in `captura/route.ts` encodes each one's traps: MyInvestor marks losses only with ↓ on the %; the big block on the MyInvestor plans screen is a total, not a row; CaixaBank writes amounts with a decimal comma but the % with a decimal point; Trade Republic's "No realizado" column is **today's** move, the total gain is the last "Ganancia" pair.
- **Validation** (`lib/captura-check.ts`): `invested` comes from the screen (CaixaBank) or as `value − gain`; then `invested + gain ≈ value` (±0.03 €) and `gain / invested ≈ pct` (±0.06 pp). A misread digit or a lost sign fails this and the row arrives with `checks` and unticked.
- **Matching** priority: exact code (`isin`, e.g. `N5459`) → `brokerName` learned on a previous import for that bank → Claude's `matchId`. Rows from an unrecognised screen (`platform: 'otra'`, e.g. a screenshot of this app) are never auto-matched, so they can't collide with good rows. Duplicate targets and a fund saved under another bank are flagged.
- **Measured** (Oct 2026, 4 real screenshots: MyInvestor funds + plans, CaixaBank, Trade Republic): 15/15 positions exact to the cent in three runs, ~9–12 s per request.
- **Applying**: `m` and `inv` from the screen, `r` recalculated, `broker` and `brokerName` learned, `priceSource: 'captura:<bank>'`, reference price cleared via `markManual()` (so the next ⟳ Precios press calibrates). Unknown rows can be added as new funds (ISIN typed in the review screen).
- Images are downscaled in the browser to 2000 px / JPEG 0.88 and capped at ~4 MB per request (Vercel rejects bodies over ~4.5 MB). Up to 6 per request.
- Children's Indexa funds are out of scope.

### Date formats (easy to get wrong)

`todayStr()`, `history[].date`, `data.lastUpd` and `Operation.date` are **DD/MM/YYYY** strings. `Fund.lastPriceDate` is **YYYY-MM-DD** (Yahoo's `regularMarketTime`, or `todayISO()` for manual edits). `RecurringContribution.lastRegistered` is **MM/YYYY**. Nothing is a `Date` object or a Firestore timestamp.

### Children (Hijos) data model

Two asset types per child:
- `cuentas[]` — bank accounts (Imagine Bank), edited in a simple modal
- `funds[]` — Indexa Capital, i.e. the two Vanguard funds `IE00BFPM9N11` (Global Stk) and `IE00BGCZ0B53` (Global Bnd)

**Legacy migration**: old Firestore data may have `funds: []` or a single fund whose `isin` starts with `INDEXA`. `HijosTab` detects this via `isLegacyIndexa` and rewrites it into the two Vanguard funds on save, using `VANGUARD_DEFAULTS(childId)`.

### Recurring contributions (AportacionesBanner)

`RecurringContribution.lastRegistered` holds `'MM/YYYY'` of the last confirmed month. The banner shows when `dayOfMonth >= 10` and `lastRegistered !== currentMonthKey`. "Saltar este mes" stamps `lastRegistered` without touching fund values.

## Auth & environment

Google Sign-In only (`contexts/AuthContext.tsx`). The allowlist is hardcoded in that file: Susana's Gmail plus `NEXT_PUBLIC_OWNER_EMAIL`. Any other account is signed straight back out with `denied: true`. Note the fail-open branch — if the resulting list is empty, every Google account is let in.

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_OWNER_EMAIL   # Tomás's Gmail — part of the auth allowlist
ANTHROPIC_API_KEY         # used by claude/, explorar/, morningstar/, captura/
```

`.env.local` also still carries `NEWS_API_KEY`, left over from when `news/route.ts` used an API; it is no longer read anywhere.
