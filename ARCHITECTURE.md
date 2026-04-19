# Pick-Up — Architecture

## Overview

Pick-Up is a React Native (Expo) app organized around three layers:

1. **UI Layer** — screens + components (pure presentation)
2. **Data Layer** — TypeScript types + mock data (swappable with Supabase)
3. **Navigation Layer** — React Navigation stack config

The guiding principle: screens are thin, data is swappable, components are reusable.

---

## Frontend Structure

```
App.tsx
└── GestureHandlerRootView        (required by bottom sheet + gesture handling)
    └── SafeAreaProvider
        └── AppNavigator
            ├── RootStack (NativeStack)
            │   ├── TabNavigator (BottomTabs) → HomeScreen, ExploreScreen, SavedScreen, ProfileScreen
            │   ├── VenueDetailScreen  (stack push)
            │   └── RunDetailScreen    (stack push)
```

### Screens are thin
Each screen:
- Owns local UI state (selected filters, search query, active tab)
- Reads from mock data directly (later: from a custom hook that calls Supabase)
- Composes reusable components — no layout logic inside components

### Components are dumb
Components receive props, render UI, call callbacks. No data fetching, no navigation calls inside components (except when passed as props).

---

## Data Flow

```
MockData (static arrays)
     ↓
Screen-level useMemo (filter + sort)
     ↓
Props → Components → Render
```

### Current (mock):
```ts
import { MOCK_VENUES } from '../data/mockVenues';
const filtered = useMemo(() => MOCK_VENUES.filter(...), [filters]);
```

### Future (Supabase):
```ts
import { useVenues } from '../hooks/useVenues';
const { venues, isLoading } = useVenues({ filters, radiusMiles });
```

The data shape (TypeScript interfaces in `data/types.ts`) does not change — only the source changes. This is intentional.

---

## Key Components and Their Roles

| Component | Role |
|---|---|
| `VenueCard` | Primary discovery card. Two variants: `sheet` (compact horizontal) for bottom sheet, `list` (full card) for Explore. |
| `RecurringRunCard` | Core product unit. Shows schedule summary, skill level, verified badge, turnout. |
| `MapPin` | Custom marker. Sport emoji + orange circle + teardrop tail. Pulse ring for popular venues. |
| `SearchBar` | Floating overlay search on map. Used on Home + Explore. |
| `FilterChipRow` | Horizontal scrolling filter strip. Combines sport chips + utility filters. |
| `WeatherBadge` | Compact inline pill. Only shown on outdoor venues. Two variants: `compact` (emoji+temp) and `full` (+ play condition). |
| `PopularityBadge` | Colored dot + label. Score 0–100 maps to Quiet / Moderate / Popular / Very Popular. |
| `DetailInfoRow` | Icon + label + value. Used in venue/run detail screens for structured info. |
| `ChatPreviewCard` | Chat room entry point. Shows label, member count, last message preview. |

---

## Navigation

**Bottom tabs** (custom floating pill bar):
- Map (HomeScreen) — primary
- Explore (ExploreScreen)
- Saved (SavedScreen)
- Profile (ProfileScreen)

**Stack screens** (push transitions):
- VenueDetail — tapped from map pins, bottom sheet cards, explore list
- RunDetail — tapped from recurring run cards everywhere

No modals in MVP. All navigation is directional (push/pop).

---

## Supabase Integration Plan

When Supabase is added, the migration path is:

### 1. Auth
```ts
// Add to App.tsx
import { SessionContextProvider } from '@supabase/auth-helpers-react';
<SessionContextProvider supabaseClient={supabase}>
```

### 2. Data queries (replace mock imports)
```ts
// src/hooks/useVenues.ts
import { supabase } from '../lib/supabase';

export function useVenues(options: VenueQueryOptions) {
  const [venues, setVenues] = useState<Venue[]>([]);
  useEffect(() => {
    supabase
      .from('venues')
      .select('*')
      .order('popularity_score', { ascending: false })
      .then(({ data }) => setVenues(data ?? []));
  }, [options]);
  return { venues };
}
```

### 3. Realtime chat
```ts
// src/hooks/useChatRoom.ts
const channel = supabase.channel(`chat:${roomId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => setMessages((prev) => [...prev, payload.new as ChatMessage]))
  .subscribe();
```

### 4. Database schema (PostgreSQL)
Tables map directly to TypeScript types in `data/types.ts`:
- `venues` ← `Venue`
- `recurring_runs` ← `RecurringRun`
- `one_time_events` ← `OneTimeEvent`
- `outdoor_conditions` ← `OutdoorConditions`
- `venue_popularity` ← `VenuePopularity`
- `saved_venues` ← `SavedVenue`
- `chat_rooms` ← `ChatRoom`
- `chat_messages` ← `ChatMessage`
- `user_preferences` ← `UserPreferences`

### 5. Row-level security
- Venues and runs: public read, authenticated write
- Saved venues: per-user only
- Chat rooms: public read for venue chats, authenticated write

---

## State Management

MVP uses local React state only (`useState`, `useMemo`). No Redux, no Zustand.

This is intentional. The data requirements at launch do not justify a global store. When Supabase is added, custom hooks (`useVenues`, `useRuns`, etc.) will encapsulate async state, which is sufficient for this app's complexity.

---

## Weather Architecture

Currently: pure mock data in `mockConditions.ts`

Future path:
1. Scheduled Supabase Edge Function (runs every 30 min)
2. Calls OpenWeatherMap or Apple WeatherKit by venue coordinates
3. Writes results to `outdoor_conditions` table
4. App reads via Supabase real-time subscription
5. `utils/weather.ts` display logic stays unchanged — only data source swaps

---

## Design Token System

All visual values live in `src/constants/`:
- `colors.ts` — full color system including map pins, sports, weather, text, borders
- `typography.ts` — font sizes, weights, line heights
- `spacing.ts` — 4pt grid, border radius scale, shadow presets
- `sports.ts` — sport catalog with emoji, label, color

No magic numbers in components. All visual decisions are traceable to these tokens.
