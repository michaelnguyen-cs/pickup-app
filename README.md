# Pick-Up

**Find a game. Show up. Play.**

Pick-Up is a mobile app for discovering nearby pickup sports games and venues — open gyms, park runs, and recurring community games — without the noise of a social network.

Open the app, see what’s happening near you, and go play.

---

## What It Does

Pickup sports already exist everywhere — rec centers, parks, gyms — but the information is scattered across websites, PDFs, and word-of-mouth.

Pick-Up brings that activity into one place:

* see nearby games on a map
* understand skill level and turnout
* decide quickly if it’s worth showing up

It’s closer to a **sports-aware map** than a social app.

---

## Features

### Discovery

* **Map-first home screen** — full-screen map with sport-filtered pins and a draggable bottom sheet
* **Explore view** — filterable list of venues and runs with distance and skill level
* **Venue detail** — location info, tags, and associated runs
* **Run detail** — schedule, skill level, and expected turnout

### User Data

* **Authentication** — email/password via Supabase with persistent sessions
* **Saved venues and runs** — synced per user
* **Attendance** — “I’m Going” stored in `run_attendance`
* **Preferences** — sports, skill level, indoor/outdoor saved to `profiles`
* **Reporting** — flag inaccurate runs (“No one was there”, etc.)

### UX

* **Onboarding flow** for preferences
* **Auth-aware state** (cloud vs local fallback)
* **Optimistic updates** for saves and attendance
* **Weather badges** for outdoor runs

---

## Tech Stack

| Layer      | Technology                       |
| ---------- | -------------------------------- |
| Framework  | Expo (React Native)              |
| Language   | TypeScript                       |
| Navigation | React Navigation                 |
| Map        | react-native-maps                |
| Backend    | Supabase (Postgres + Auth + RLS) |
| Storage    | AsyncStorage (guest fallback)    |

---

## Architecture

### Backend (Supabase)

The app uses a typed PostgreSQL schema accessed via `supabase-js`.

**Core tables:**

* `profiles` — user preferences
* `venues` — physical locations
* `runs` — recurring time slots
* `saved_venues` — bookmarked venues
* `saved_runs` — bookmarked runs
* `run_attendance` — attendance state
* `run_reports` — user-submitted accuracy reports

Row Level Security ensures users can only modify their own data.

---

### Context Layer

* `AuthContext` — session + user + profile
* `SavedContext` — saved items (Supabase + fallback)
* `PrefsContext` — user preferences
* `LocationContext` — device location

---

### Data Flow

* Data fetched via `useVenues()` and `useRuns()`
* Queries live in `src/lib/queries/`
* Mapping functions convert DB rows → app types

---

## Project Structure

```
pickup/
├── src/
│   ├── components/
│   ├── screens/
│   ├── context/
│   ├── lib/
│   ├── hooks/
│   ├── types/
│   ├── constants/
│   ├── navigation/
│   └── utils/
├── supabase/
│   ├── schema.sql
│   └── seed.sql
└── App.tsx
```

---

## Setup

### 1. Install

```bash
git clone <repo-url>
cd pickup
npm install
```

### 2. Environment

Create `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=your-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
```

---

### 3. Database

Run in Supabase SQL Editor:

* `schema.sql`
* `seed.sql` (optional)

---

### 4. Start

```bash
npx expo start
```

---

## Roadmap

* Weather API integration
* Realtime attendance
* Push notifications
* Run submission
* Trust/freshness signals
* AI-assisted schedule ingestion

---

## What This Is Not

* Not a social network
* Not an event/ticketing platform
* Not a fitness tracker
* Not a private scheduling tool
