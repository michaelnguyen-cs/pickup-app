# Pick-Up

**Open the app. See where to play, when to play, and whether it's worth going.**

Pick-Up is a mobile-first sports discovery app. It helps you find nearby pickup games, recurring open gym schedules, sports facilities, and outdoor play conditions — instantly, without signing up for a social network.

---

## Core Concept

Pick-Up is a **utility-first local sports discovery tool**, not a social media app. The primary value is surfacing existing recurring activity that is already happening in your area — YMCA open gyms, college rec centers, known park pickup games — and presenting it in a fast, map-first experience.

User-generated events exist but are secondary. The app should feel closer to a sports-aware Google Maps than to Instagram.

---

## Target User

College students, young professionals, and recreational athletes who want to find a game quickly without the overhead of scheduling, friend networks, or app accounts.

---

## Key Features (MVP)

| Feature | Description |
|---|---|
| **Home Map** | Full-screen dark map with sport pins, filter chips, and a draggable bottom sheet of nearby venues and runs |
| **Venue Detail** | Hero image, address, schedule, weather warning (outdoor), best times, amenities, action buttons |
| **Run Detail** | Recurring run info: schedule breakdown, skill level, turnout, cost, verified badge |
| **Explore** | Sortable/filterable list view of venues and recurring runs near you |
| **Saved** | Bookmarked venues and runs |
| **Profile / Preferences** | Sport preferences, skill level, radius, notifications — no social profile |
| **Weather Badges** | Compact inline condition pills on outdoor venues (sunny, rainy, windy, etc.) |
| **Group Chat Entry** | Utility chat rooms tied to venues — for coordination only, no social feed |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo (managed workflow) |
| Language | TypeScript |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| Map | react-native-maps (Google Maps provider) |
| Bottom Sheet | @gorhom/bottom-sheet |
| Gestures | react-native-gesture-handler |
| Animations | react-native-reanimated |
| Icons | @expo/vector-icons (Ionicons) |
| Data (MVP) | Local mock data |
| Future Backend | Supabase (auth, PostgreSQL, Realtime) |

---

## Running Locally

```bash
# Prerequisites: Node 18+, Expo CLI, iOS Simulator or Android Emulator or Expo Go app

# 1. Clone / navigate to project
cd pickup

# 2. Install dependencies
npm install

# 3. Start the dev server
npx expo start

# 4. Press 'i' for iOS, 'a' for Android, or scan QR with Expo Go
```

> **Note:** For the map to render on Android, you need a Google Maps API key in `app.json`. For iOS in dev, the map renders without a key.

---

## Folder Structure

```
src/
├── components/          # Reusable UI components
│   ├── VenueCard.tsx        # Primary discovery card (list + sheet variants)
│   ├── RecurringRunCard.tsx # Core product card for recurring runs
│   ├── MapPin.tsx           # Custom map markers
│   ├── SearchBar.tsx        # Map overlay search input
│   ├── FilterChipRow.tsx    # Horizontal filter strip
│   ├── SportChip.tsx        # Sport + utility filter chips
│   ├── WeatherBadge.tsx     # Compact outdoor condition pills
│   ├── PopularityBadge.tsx  # Activity level indicator
│   ├── DetailInfoRow.tsx    # Icon + label + value row for detail screens
│   └── ChatPreviewCard.tsx  # Group chat entry point card
│
├── screens/             # One component per screen
│   ├── HomeScreen.tsx       # Primary: full-screen map + bottom sheet
│   ├── VenueDetailScreen.tsx
│   ├── RunDetailScreen.tsx
│   ├── ExploreScreen.tsx
│   ├── SavedScreen.tsx
│   └── ProfileScreen.tsx
│
├── navigation/          # Navigation config
│   ├── AppNavigator.tsx     # Root stack + tab navigator
│   └── types.ts             # Stack param type definitions
│
├── data/                # Types + mock data
│   ├── types.ts             # All TypeScript interfaces
│   ├── mockVenues.ts        # 8 realistic US venues
│   ├── mockRuns.ts          # 7 recurring runs
│   ├── mockConditions.ts    # Weather + popularity data
│   ├── mockChats.ts         # Chat rooms + messages
│   └── index.ts             # Re-exports
│
├── constants/           # Design tokens
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   └── sports.ts
│
└── utils/               # Pure helper functions
    ├── weather.ts           # Badge configs, play condition display
    └── formatting.ts        # Time, distance, schedule formatting
```

---

## Future Roadmap

| Priority | Feature |
|---|---|
| High | Supabase auth (email + Google) |
| High | Real location-based venue fetching |
| High | Real weather API integration (OpenWeatherMap or WeatherKit) |
| High | Realtime group chat via Supabase Realtime |
| Medium | QR share code for venues and runs |
| Medium | Push notifications for nearby activity |
| Medium | Venue/run submission flow (user-generated data) |
| Medium | Map heatmap layer for activity density |
| Low | Offline caching for saved venues |
| Low | Web version via Expo for Web |
| Later | College campus partnership integrations |
| Later | YMCA / rec center schedule scraping pipeline |

---

## What This Is Not

- Not a social network (no followers, friends, feed, stories)
- Not an event ticketing app
- Not a gamification / badge / points app
- Not a fitness tracker
