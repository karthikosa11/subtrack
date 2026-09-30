# SubTrack

A mobile app for people who have lost track of what they pay for every month. It lists every
subscription in one place, reminds you three days before each renewal, and uses Claude to tell you,
in plain language, which ones you should keep, downgrade, or cancel based on how much you use them.

## The problem

People lose money to subscriptions they forgot about: streaming, software, fitness apps, delivery
memberships, cloud storage. This complaint comes up again and again in app store reviews, G2 and
Capterra reviews, and Reddit threads. Budgeting apps track spending in general, but they don't answer
the specific question: *what am I paying for right now, and should I still be paying for it?*

## What it does

- **Track:** add a subscription with its name, cost, billing cycle, renewal date and category. The
  home screen shows this month's total spend as one large number, with the yearly total under it.
- **Warn:** subscriptions renewing within 7 days get a brick-red dot. You get a local notification
  3 days before each renewal.
- **Ask:** a one-tap daily check-in ("Rarely / Sometimes / Often") records how much you actually use
  each subscription.
- **Advise:** Claude reads cost plus your recent ratings and says what to do, for example: *"You're
  paying $15.99/month and rated it 'Rarely' three times in a row. This is probably worth
  cancelling."* A short Smart Summary on the home screen names the one subscription most worth
  reconsidering this month.
- **Decide:** swipe a row to mark it cancelled, or record that you're keeping it. Every renewal you
  skip adds to a running "saved by cancelling" total.
- **Break down:** a bar chart of monthly spend by category, with exact amounts listed beneath it.

## Design decisions

The app is meant to read like a bank statement or a paper ledger, not a SaaS dashboard.

| Decision | Why |
| --- | --- |
| Warm paper grey `#EDEAE3`, ink `#2B2A28`, ledger green `#3D5A4C` | Feels like a financial document. Deliberately avoids the cream-plus-coral and black-plus-neon palettes that templates default to. |
| Numbers in Fraunces (serif, tabular figures), everything else in Inter | Money is what users come here to see, so it gets the most distinctive type. Tabular figures keep the columns aligned. |
| Hairline dividers, no cards or shadows | A statement is a list of lines. Cards with shadows would add visual weight without adding information. |
| AI summary as a margin note (a left rule, not a box) | It's commentary on your numbers, not the main content. |
| Brick red only for renewal warnings; sage only for the saved-money number | Each accent color means one thing, so it carries meaning at a glance. |
| Horizontal bars, not a pie chart | Lengths are easier to compare than angles, and category names fit beside the bars. |
| Motion only on user action (the swipe, and the saved number ticking up) | Animation confirms something you did. It never plays on load, and it respects the system's reduce-motion setting. |
| Dark mode uses the same structure with warm near-black `#1C1B19` and brighter accents | Every text color is checked for contrast in both themes (ratios are noted in `app/src/theme/tokens.ts`). |

## Architecture

```
 Expo app (React Native)                  FastAPI                          Supabase
┌──────────────────────────┐   JWT    ┌────────────────────────┐        ┌───────────────┐
│ Expo Router screens      │ ───────▶ │ verify token (JWKS)    │        │ Auth          │
│ React Query (server data)│          │ /subscriptions, usage, │ ─────▶ │ Postgres      │
│ Zustand (UI state)       │ ◀─────── │ decisions, /summary    │        │  subscriptions│
│ expo-notifications       │   JSON   │ renewal + savings math │        │  usage_logs   │
│ Supabase Auth client ────┼──────────┼────────────────────────┼──────▶ │  insights     │
└──────────────────────────┘          │ Claude insights ───────┼──┐     │  summaries    │
                                      └────────────────────────┘  │     └───────────────┘
                                                                  ▼
                                                           Anthropic API
```

- **The app only uses Supabase for sign-in.** Every read and write goes through FastAPI, which
  verifies the Supabase JWT and scopes each query to that user. The Anthropic key never ships in
  the app.
- **Renewal dates are derived, not stored.** Each subscription keeps the renewal date you entered
  (its anchor), and every later renewal is calculated as anchor + n cycles. A plan billed on the
  31st renews on Feb 28 and then Mar 31, instead of getting stuck on the 28th. Reading data never
  writes to the database.
- **"Today" is the user's date,** sent by the app in an `X-Local-Date` header, so a renewal due
  "tomorrow" is tomorrow in the user's timezone.
- **Money saved** = cost × each renewal skipped since cancelling. The first skipped charge counts
  immediately.
- **AI results are cached.** Each insight is stored with a hash of its inputs (cost, cycle, last 5
  ratings). Opening a screen reuses the stored insight unless those inputs have changed. If Claude
  is unavailable, the app falls back to the last cached answer and marks it stale.
- **Claude usage:** `claude-opus-5` (can be changed with `CLAUDE_MODEL`) at low effort, with
  structured output (`messages.parse` into a Pydantic model), so the app always gets a
  `recommendation` of keep, downgrade or cancel plus a short body. Server-side refusal fallback
  (`fallbacks: "default"`) is turned on.

## Running it locally

First, set up Supabase and fill in both `.env` files by following
[supabase/README.md](supabase/README.md) step by step. Then you need two PowerShell windows open at
the same time.

**Window 1: start the backend**

```powershell
cd C:\Users\osaka\OneDrive\Desktop\SubTrack\backend
.venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Leave this window open. It's working when it says `Uvicorn running on http://0.0.0.0:8000`.

**Window 2: start the app**

```powershell
cd C:\Users\osaka\OneDrive\Desktop\SubTrack\app
npx expo start
```

A QR code appears. Install **Expo Go** from the App Store or Play Store, then scan the QR code
(Android: from inside Expo Go; iPhone: with the Camera app). Your phone and computer must be on the
same Wi-Fi.

If Windows asks whether to allow Python or Node through the firewall, click **Allow**. Otherwise
your phone can't reach the backend.

**Setting up from scratch on another computer** (you don't need this on the computer where the
project was built):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements-dev.txt
cd ..\app
npm install
```

## Tests and checks

```powershell
cd backend
.venv\Scripts\python -m pytest        # renewal math, savings, totals, AI cache, sign-in checks
cd ..\app
npx tsc --noEmit
npx expo lint
```

## Project layout

```
app/src/app/          screens (Expo Router): sign-in, (tabs)/index, (tabs)/breakdown, subscription/*
app/src/components/   ledger primitives: rows, hairlines, margin note, buttons, saved counter, chart
app/src/lib/          API client, Supabase auth, notifications, formatting
app/src/theme/        light and dark tokens, typography
backend/app/          FastAPI app: auth, models, routers, services (renewals, money, savings, insights)
backend/alembic/      database migrations
```

## Shipping to testers

Build with EAS (`npx eas-cli@latest build --profile preview`) or share through Expo Go. Before that,
deploy the backend somewhere the phones can reach (Render, Fly.io and Railway all run the uvicorn
command above) and set `EXPO_PUBLIC_API_URL` to its URL.
