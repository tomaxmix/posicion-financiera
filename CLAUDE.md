# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build (also runs TypeScript check)
npm run lint     # ESLint
npx tsc --noEmit # Type-check only (run before every commit)
```

Deploy: `git push` → Vercel auto-deploys from `main`. No manual deploy step.

## Architecture

**Next.js 16 App Router** with TypeScript, Firebase/Firestore backend, deployed on Vercel.

### Data flow

Single Firestore document `shared/familia-ferrandiz` stores all state for all users. Both Tomás and Susana read/write the same document — there is no per-user isolation.

```
Firestore (shared/familia-ferrandiz)
  └── useUserData hook (hooks/useUserData.ts)
        └── Dashboard.tsx  ← single root component, owns all state
              ├── passes data + setters as props to each tab
              └── every setter auto-saves to Firestore on call
```

`useUserData` exposes async setters (`setFunds`, `setChildren`, etc.) that simultaneously update React state and persist to Firestore. All tab components receive these setters as `onSave*` props — they never call Firestore directly.

### Key files

| File | Purpose |
|------|---------|
| `lib/types.ts` | All TypeScript interfaces (`Fund`, `Child`, `RecurringContribution`, etc.) |
| `lib/defaults.ts` | Default fund/child data used on first load and for migration |
| `lib/firestore.ts` | All Firestore read/write functions |
| `lib/styles.ts` | Shared inline-style constants (`S.card`, `S.inp`, `S.btn`, etc.) — always use these instead of duplicating styles |
| `hooks/useUserData.ts` | Loads from Firestore on auth, exposes typed async setters |
| `components/Dashboard.tsx` | Root: auth gate, header (price update button), tab routing, AportacionesBanner |

### Tab components

Each tab lives in `components/<name>/<Name>Tab.tsx`:

- **PatrimonioTab** — net worth overview (accounts + investments + real estate − debt)
- **InversionesTab** — fund portfolio table with P&L, price dates, expandable charts
- **EvolucionTab** — historical patrimony chart + children evolution
- **HijosTab** — Simón and Félix: Imagine Bank accounts + Indexa Capital (Vanguard funds)
- **OperativaTab** — trade log, alerts, recurring contributions, transfer simulator
- **NoticiasTab** — AI-generated market news via `/api/claude`
- **ExplorarTab** — sub-tabs: MyInvestor AI screener + Morningstar screener

### API routes (`app/api/`)

| Route | Description |
|-------|-------------|
| `market/route.ts` | Fetches live prices via Yahoo Finance. Uses `KNOWN` map (ISIN→Yahoo ticker) for verified funds; falls back to Yahoo search API. Returns `changePercent` and `date` (from `meta.regularMarketTime`). |
| `morningstar/route.ts` | Uses Claude Haiku (`claude-haiku-4-5-20251001`) to return structured fund metadata. Enriches with Yahoo Finance 1Y price data. Morningstar's own API is blocked by Cloudflare. |
| `news/route.ts` | Claude-powered market news |
| `claude/route.ts` | General Claude AI endpoint for MyInvestor screener |
| `explorar/route.ts` | MyInvestor fund search |

### Children (Hijos) data model

Children have two asset types:
- `cuentas[]` — bank accounts (Imagine Bank), edited via a simple modal
- `funds[]` — Indexa Capital funds, which are the two Vanguard ETFs: `IE00BFPM9N11` (Vanguard Global Stk) and `IE00BGCZ0B53` (Vanguard Global Bnd)

**Legacy migration**: Old Firestore data may have `funds: []` or a single fund with `isin.startsWith('INDEXA')`. `HijosTab` detects this via `isLegacyIndexa` and auto-migrates to the two Vanguard funds on save. `VANGUARD_DEFAULTS(childId)` generates the migration structure.

### Recurring contributions (AportacionesBanner)

`RecurringContribution.lastRegistered` stores `'MM/YYYY'` of last confirmed month. The banner appears when `dayOfMonth >= 10` and `lastRegistered !== currentMonthKey`. "Saltar este mes" marks `lastRegistered` without modifying fund values.

### Price updates

The `⟳ Precios` button in the header calls `/api/market` with all funds (portfolio + children combined). Results update `fund.m` (market value), `fund.r` (return %), `fund.lastPriceDate` (YYYY-MM-DD from Yahoo's `regularMarketTime`), and `data.lastUpd`.

## Environment variables

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
ANTHROPIC_API_KEY
```

Auth: Google Sign-In only, handled in `contexts/AuthContext.tsx`. The app is restricted to the Ferrandiz family Google accounts.
