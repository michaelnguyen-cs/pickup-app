# Pick-Up — Dev Log

Concise record of significant changes. Newest entries at the top.

---

## 2026-04-16 — Phase 2: UI/UX Polish (Home Map, Bottom Sheet, Venue Cards)

**What was done:**

1. **Bottom sheet redesign (`HomeScreen.tsx`, `VenueCard.tsx`)**
   - Snap points changed from percentage strings to pixel-based values
   - Peek height calculated as `header + 1.55 × card height ≈ 247px` — shows exactly 1.5 cards
   - `VenueCard` sheet variant fully redesigned: taller card (96px image), stronger name hierarchy,
     orange distance pill with location icon, sport + indoor/outdoor on one clean meta line
   - Status badge row added: "Open Now" (green), "Tonight 7pm" (amber), "Runs Weekly" (gray)
   - Sheet subtitle dynamically shows `"X open now · Y total"` when any venues are active

2. **Map pin → floating preview card (`MapPreviewCard.tsx` — new, `HomeScreen.tsx`)**
   - New `MapPreviewCard` component with `Animated.spring` entrance + `Animated.timing` exit
   - Card floats at `bottom: TAB_BAR_H + PEEK_HEIGHT + 10` — always above tab bar and sheet handle
   - Shows: sport emoji icon, venue name, status badge, address, distance, "View →" CTA, × dismiss
   - Pin tap no longer auto-expands the sheet — sheet stays at peek, card appears above it
   - Tapping map background clears selection and hides preview card
   - Expanding sheet past peek index dismisses preview card automatically

3. **Image loading + fallback (`VenueCard.tsx`)**
   - New `VenueImage` sub-component handles loading/error state cleanly
   - Gray skeleton visible while image loads (instant, no flash)
   - Sport emoji centered on tinted background if URL errors
   - List variant image locked to 16:9 aspect ratio (no layout shift)
   - Sheet variant image locked to 96×96 with rounded corners

4. **Status badge utility (`formatting.ts`)**
   - New `getVenueStatusBadge(venueId, runs)` — derives live status from run schedules vs. current time
   - Returns `{ label, color, bg }` — display-ready, consumed by VenueCard and MapPreviewCard
   - Propagated to Explore and Saved screens too

**Why:**
Phase 1 scaffold was structurally correct but the home screen bottom sheet felt like a list, not a discovery surface.
These changes make the app feel usable on first open.

---

## 2026-04-16 — Phase 1: Project Setup + Full MVP Scaffold

**What was done:**
- Initialized Expo + TypeScript project (`blank-typescript` template)
- Installed all Phase 1–7 dependencies:
  - `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`
  - `react-native-screens`, `react-native-safe-area-context`
  - `react-native-gesture-handler`, `react-native-reanimated`
  - `react-native-maps`
  - `@gorhom/bottom-sheet`
  - `expo-location`, `expo-haptics`, `expo-linking`
  - `@expo/vector-icons`
- Created full `src/` folder structure
- Built design token constants: `colors.ts`, `typography.ts`, `spacing.ts`, `sports.ts`
- Built all TypeScript data types (`data/types.ts`) — maps 1:1 to future Supabase tables
- Created realistic mock data for 8 venues, 7 recurring runs, weather conditions, chat rooms
- Built all 9 reusable UI components (WeatherBadge, PopularityBadge, SportChip, FilterChip, VenueCard, RecurringRunCard, MapPin, SearchBar, FilterChipRow, DetailInfoRow, ChatPreviewCard)
- Built all 6 screens: Home (map), VenueDetail, RunDetail, Explore, Saved, Profile
- Configured navigation: custom floating tab bar + native stack for detail screens
- Wired `App.tsx` with GestureHandlerRootView + SafeAreaProvider
- Added `babel.config.js` with Reanimated plugin
- Added README.md, DEVLOG.md, ARCHITECTURE.md

**Design decisions applied from reference screenshots:**
- Dark teal map style (from Pickup app reference) via Google Maps customMapStyle
- Orange activity pins with sport emoji
- Floating pill-style tab bar (rounded, shadow-elevated) matching reference aesthetic
- Bottom sheet with tab toggle (Venues / Recurring Runs)
- Weather badges as compact inline pills — not a full weather widget
- "Around You" discovery framing on Explore screen (from dark sports app reference)
- Full-bleed hero image on detail screens (dark sports app detail ref)
- DoorDash-style structured info rows on detail screens
- Sport filter chips + utility chips (Open Now, Popular Now) on all discovery surfaces

**Why:**
- Phase 1 goal is to have a complete, runnable scaffold before any polish passes
- All screens work with mock data — no backend needed yet
- Clean type system now means Supabase integration later requires only swapping data layer

**Next:**
- Phase 2: Review and polish UI components
- Phase 3+: Add Supabase auth, real location, real weather

---
