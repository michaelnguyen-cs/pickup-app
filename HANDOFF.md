\# Pick-Up App: Complete Project Context and Development Handoff



You are taking over development and technical guidance for my mobile app called \*\*Pick-Up\*\*.



Treat this document as the core historical and product context for the project. However, do not blindly assume every described feature is implemented exactly as intended. Before making major changes, inspect the actual repository, database schema, package versions, environment configuration, and current runtime behavior.



Your job is to understand the product, preserve its purpose, assess the true current state, fix existing problems carefully, and continue building it without unnecessarily rewriting working code.



\---



\# 1. Important clarification



This project is called \*\*Pick-Up\*\* and is a mobile app for discovering pickup sports.



It is completely separate from my trash-bin-cleaning, pressure-washing, BinHo, or Jobber-style service-business app.



In this project:



\* “Pickup” means pickup basketball, soccer, volleyball, open gyms, park games, and similar sports activities.

\* A “run” means a recurring pickup game or open-gym time slot.

\* A “venue” means the physical location where a pickup game happens.

\* The product is consumer-facing.

\* The primary experience is mobile and location-based.



Do not mix this project with any home-service, route-planning, customer-management, or trash-bin-pickup application.



\---



\# 2. Product name and tagline



\*\*Product name:\*\* Pick-Up



\*\*Tagline:\*\* Find a game. Show up. Play.



Pick-Up is a mobile app that helps people discover nearby pickup sports games, recurring open gyms, park runs, and sports facilities.



The app should let a user open it, see where games regularly happen near them, determine whether a game is worth attending, get directions, and show up.



The core promise is simplicity:



1\. Find a nearby game.

2\. Check the time, skill level, location, and expected activity.

3\. Show up and play.



\---



\# 3. The problem Pick-Up solves



Pickup sports already happen everywhere:



\* YMCA open gyms

\* Recreation-center basketball

\* Public park games

\* College-campus runs

\* Community volleyball

\* Indoor soccer facilities

\* Local athletic clubs

\* Recurring informal games



The problem is that this information is scattered and difficult to discover.



Schedules may currently exist in:



\* Recreation-center webpages

\* YMCA program schedules

\* PDFs

\* Flyers

\* Facebook groups

\* Instagram posts

\* Facility calendars

\* Word of mouth

\* Outdated websites

\* Front-desk information



A person who wants to play often has to search multiple websites, call facilities, ask friends, or physically visit a location without knowing whether anyone will be there.



Pick-Up aims to centralize this information in one place.



The app should answer questions such as:



\* Where can I play basketball near me tonight?

\* Which nearby gyms have recurring open runs?

\* Is this run happening right now?

\* What days does this game normally happen?

\* Is the game casual or competitive?

\* Is the venue indoors or outdoors?

\* How far away is it?

\* Is there a fee?

\* How many people normally attend?

\* Are other people planning to attend?

\* Is the schedule still accurate?

\* How do I get there?



\---



\# 4. Long-term product vision



The long-term vision is to become a \*\*sports-aware Google Maps for pickup activity\*\*.



Pick-Up should organize the fragmented world of recurring pickup sports into a structured, searchable, map-based database.



A user should eventually be able to open the map anywhere and see:



\* Nearby sports venues

\* Recurring runs

\* Open gyms

\* Active games

\* Popular times

\* Expected turnout

\* Live attendance intentions

\* Skill levels

\* Costs

\* Indoor or outdoor status

\* Weather conditions

\* Schedule reliability

\* Verification history

\* Directions



The value of the product comes from trusted, structured, location-based information—not from trying to create another social-media platform.



\---



\# 5. Product identity and non-goals



Pick-Up is intentionally \*\*not a traditional social network\*\*.



Do not gradually turn it into a generic social app unless I explicitly change the product strategy.



The app should not be centered around:



\* Followers

\* Friends lists

\* Social feeds

\* Stories

\* Influencer content

\* Likes

\* Engagement farming

\* Endless scrolling

\* Posting unrelated content

\* Direct-message growth loops

\* Notifications whose only purpose is to bring users back into the app



Pick-Up is also not primarily:



\* An event-ticketing platform

\* A fitness tracker

\* A private-team scheduling tool

\* A league-management platform

\* A tournament-management platform

\* A gamified workout app

\* A general venue-review app



Some community or communication features might eventually be useful, but they must support the primary action of finding and attending a game.



The product should remain utility-first.



\---



\# 6. Target users



Primary users include:



\* College students looking for nearby pickup games

\* Adults who want to play sports recreationally

\* People who recently moved to a new area

\* Players whose normal group is unavailable

\* Travelers who want to find a game

\* Beginners looking for casual runs

\* Competitive players looking for higher-level games

\* People looking for indoor games during bad weather

\* People looking for recurring games without joining a league



Secondary users may eventually include:



\* YMCA staff

\* Recreation-center staff

\* Gym managers

\* Campus recreation departments

\* Sports-facility operators

\* Community organizers

\* Trusted local contributors

\* Moderators who verify schedules



\---



\# 7. Core product experience



\## 7.1 Map-first home screen



The main screen is intended to be a full-screen map showing nearby venues and pickup activity.



Important characteristics:



\* Dark visual design

\* Location-aware

\* Sport-filtered map pins

\* User-location centering

\* Draggable bottom sheet

\* Nearby venue and recurring-run cards

\* Quick filters

\* “Open Now” or currently active signals

\* Easy transition from map pin to venue details



The map is not just decoration. It is the primary discovery interface.



\## 7.2 Explore screen



The Explore screen provides a list-based alternative to the map.



Users should be able to browse and filter venues and runs by factors such as:



\* Distance

\* Sport

\* Skill level

\* Indoor or outdoor

\* Current availability

\* Popularity

\* Day

\* Time

\* Saved status



The current implementation reportedly has working search on the Explore screen, while the Home screen search may still be nonfunctional.



\## 7.3 Venue detail screen



A venue page should provide enough information for a user to decide whether to visit.



Possible information includes:



\* Venue name

\* Address

\* Distance

\* Hero image

\* Primary sport

\* Other supported sports

\* Indoor or outdoor status

\* Description

\* Amenities

\* Associated recurring runs

\* “Open Now” status

\* Upcoming run information

\* Popular or best times

\* Current or expected activity

\* Weather warning for outdoor venues

\* Directions button

\* Save/bookmark button

\* Attendance action



Some of these fields are part of the intended product but may still use placeholders or may not render when the backend lacks data.



\## 7.4 Run detail screen



A run represents a recurring pickup-game time slot.



A run page should eventually include:



\* Run title

\* Venue

\* Sport

\* Day of week

\* Start time

\* End time

\* Skill level

\* Indoor or outdoor

\* Cost

\* Notes

\* Typical turnout

\* Organizer or source

\* Verification status

\* Last verified date

\* Attendance count

\* “I’m Going” or “Count Me In” action

\* Save run action

\* Report inaccurate information action



A run is generally recurring rather than a single one-time event.



For example:



> Tuesday basketball at a YMCA from 6:00 PM to 9:00 PM



In the current database model, a run that happens on multiple days may be represented as separate rows for each day and time occurrence.



\## 7.5 Saved screen



Users should be able to save:



\* Venues

\* Runs



Guest users may use local device storage.



Signed-in users should eventually have saves synced through Supabase so they appear across devices.



The saved venues and saved runs tabs should reflect real user data rather than hardcoded IDs.



\## 7.6 Profile and preferences



Users should eventually be able to manage:



\* Name

\* Username

\* Avatar

\* Preferred sports

\* Skill level

\* Indoor/outdoor preference

\* Search radius

\* Notification preferences



The app already has at least some preference UI, but the last reliable status report said several Profile screen settings were still local `useState` values and reset after the app restarted.



\---



\# 8. Design and UX principles



Preserve these principles:



\## 8.1 Fast decision-making



A user should quickly understand:



\* What sport is happening

\* Where it is

\* When it happens

\* How far away it is

\* What level it is

\* Whether it is likely to be active

\* Whether the information is trustworthy



Avoid forcing users through unnecessary screens.



\## 8.2 Map-first, not feed-first



The core mental model is location discovery.



Do not replace the map experience with a generic content feed.



\## 8.3 Recurring activity over one-time events



The app’s initial advantage is organizing recurring pickup activity.



Recurring runs are more valuable than constantly creating individual event records for the same weekly activity.



\## 8.4 Trust and freshness



Incorrect schedules can destroy user trust.



The app must eventually communicate:



\* Where information came from

\* When it was last checked

\* Whether it is official

\* Whether users have recently confirmed it

\* Whether it has received reports

\* Whether a time was inferred

\* Whether a run needs verification



\## 8.5 Minimal social pressure



The user should be able to use Pick-Up without building a profile-centered social identity.



\## 8.6 Mobile-first implementation



The experience should work well on both iOS and Android, including:



\* Safe-area handling

\* Keyboard behavior

\* Touch targets

\* Map gestures

\* Bottom-sheet gestures

\* Loading states

\* Permission states

\* Small screens

\* Slow connections



\---



\# 9. Current technology stack



The project was built as an Expo-managed React Native application.



Known stack:



\* Expo

\* React Native

\* TypeScript with strict typing

\* React Navigation

\* Native stack navigation

\* Bottom-tab navigation

\* `react-native-maps`

\* Google Maps provider where applicable

\* `@gorhom/bottom-sheet`

\* `react-native-gesture-handler`

\* `react-native-reanimated`

\* `@expo/vector-icons`, particularly Ionicons

\* Supabase JavaScript client v2

\* Supabase PostgreSQL

\* Supabase Auth

\* Supabase Row Level Security

\* AsyncStorage

\* Expo Location or equivalent location functionality



The backend is Supabase-based.



The frontend uses React contexts, hooks, a query layer, reusable components, and mapping functions that convert database rows into app-domain TypeScript objects.



Do not replace this stack without a strong reason and my approval.



\---



\# 10. Known project structure



The repository has historically followed approximately this structure:



```text

pickup/

├── src/

│   ├── components/

│   │   ├── VenueCard.tsx

│   │   ├── RecurringRunCard.tsx

│   │   ├── MapPin.tsx

│   │   ├── MapPreviewCard.tsx

│   │   ├── WeatherBadge.tsx

│   │   ├── PopularityBadge.tsx

│   │   ├── DetailInfoRow.tsx

│   │   └── other reusable UI components

│   ├── screens/

│   │   ├── HomeScreen.tsx

│   │   ├── ExploreScreen.tsx

│   │   ├── SavedScreen.tsx

│   │   ├── VenueDetailScreen.tsx

│   │   ├── RunDetailScreen.tsx

│   │   ├── ProfileScreen.tsx

│   │   ├── OnboardingScreen.tsx

│   │   └── auth/

│   │       ├── SignInScreen.tsx

│   │       └── SignUpScreen.tsx

│   ├── context/

│   │   ├── AuthContext.tsx

│   │   ├── SavedContext.tsx

│   │   ├── PrefsContext.tsx

│   │   └── LocationContext.tsx

│   ├── lib/

│   │   ├── supabase.ts

│   │   └── queries/

│   │       ├── venues.ts

│   │       └── runs.ts

│   ├── hooks/

│   │   ├── useVenues.ts

│   │   └── useRuns.ts

│   ├── types/

│   │   └── database.ts

│   ├── constants/

│   ├── navigation/

│   │   ├── AppNavigator.tsx

│   │   └── types.ts

│   └── utils/

│       ├── formatting.ts

│       └── weather.ts

├── supabase/

│   ├── schema.sql

│   ├── seed.sql

│   └── possible later ingestion SQL

├── App.tsx

├── app.json

├── package.json

└── .env.local

```



Verify the real structure rather than assuming it still matches this exactly.



\---



\# 11. Application contexts



\## 11.1 AuthContext



Intended responsibilities:



\* Current Supabase session

\* Current authenticated user

\* Current profile row

\* Initial session loading

\* Sign in

\* Sign up

\* Sign out

\* Auth-state listener

\* Token refresh

\* Profile loading after authentication



Core email/password authentication was reported as working.



\## 11.2 SavedContext



Intended responsibilities:



\* Saved venue IDs

\* Saved run IDs

\* Toggle save state

\* Optimistic UI updates

\* Supabase persistence for authenticated users

\* AsyncStorage fallback for guests

\* Loading state for saved data



Historically, this context initially handled saved venues locally with AsyncStorage.



The last verified status said authenticated saves were not yet synced to Supabase, despite the database tables already existing.



Inspect the current implementation before assuming the migration was completed.



\## 11.3 PrefsContext



Intended responsibilities:



\* Preferred sports

\* Skill level

\* Indoor/outdoor preference

\* Search radius

\* Notification settings

\* Onboarding completion

\* Supabase profile synchronization for authenticated users

\* Local fallback for guests



The Profile screen reportedly had preference controls, but many values were still local-only and reset between sessions.



\## 11.4 LocationContext



Reported responsibilities:



\* Request foreground location permission

\* Retrieve initial GPS coordinates

\* Watch for location changes

\* Expose locating status

\* Clean up location subscriptions

\* Provide coordinates to map screens and distance calculations



The previous implementation reportedly used:



\* Balanced accuracy for the first location fix

\* Lower accuracy for continued updates

\* A movement threshold around 50 meters

\* A time interval around 30 seconds



Verify the exact current values.



\---



\# 12. Current Supabase database model



The confirmed core schema includes the following tables.



\## 12.1 `profiles`



Purpose: one user-profile row per Supabase Auth user.



Known fields:



\* `id`

\* `username`

\* `full\_name`

\* `avatar\_url`

\* `sports`

\* `skill\_level`

\* `indoor\_outdoor`

\* `created\_at`



The `id` mirrors `auth.users.id`.



An automatic trigger was created to insert a profile row after a new Auth user is created.



Known skill levels:



\* `beginner`

\* `casual`

\* `intermediate`

\* `competitive`

\* `mixed`



Known indoor/outdoor values:



\* `indoor`

\* `outdoor`

\* `both`



\## 12.2 `venues`



Purpose: physical locations where pickup games happen.



Known fields:



\* `id`

\* `name`

\* `sport\_id`

\* `address`

\* `city`

\* `state`

\* `latitude`

\* `longitude`

\* `image\_url`

\* `is\_indoor`

\* `description`

\* `popularity\_score`

\* `created\_at`



Venue data is publicly readable.



Normal users are not intended to directly write official venue data.



\## 12.3 `runs`



Purpose: recurring pickup-game time slots at a venue.



Known fields:



\* `id`

\* `venue\_id`

\* `title`

\* `sport\_id`

\* `day\_of\_week`

\* `start\_time`

\* `end\_time`

\* `skill\_level`

\* `is\_indoor`

\* `notes`

\* `created\_at`



Known day values:



\* `mon`

\* `tue`

\* `wed`

\* `thu`

\* `fri`

\* `sat`

\* `sun`



Times were stored as text in `HH:MM` 24-hour format.



One logical multi-day run may currently be stored as multiple database rows.



\## 12.4 `saved\_venues`



Purpose: user-bookmarked venues.



Known fields:



\* `user\_id`

\* `venue\_id`

\* `created\_at`



The composite primary key is:



```text

(user\_id, venue\_id)

```



\## 12.5 `saved\_runs`



Purpose: user-bookmarked recurring runs.



Known fields:



\* `user\_id`

\* `run\_id`

\* `created\_at`



The composite primary key is:



```text

(user\_id, run\_id)

```



\## 12.6 `run\_attendance`



Purpose: store whether a user plans to attend a run.



Known fields:



\* `user\_id`

\* `run\_id`

\* `status`

\* `created\_at`



Known status values:



\* `attending`

\* `maybe`

\* `not\_attending`



The current schema appears to treat attendance as attached to the recurring run itself rather than a dated occurrence.



This may eventually need redesigning because someone attending “Tuesday basketball” this week does not necessarily mean they are attending every Tuesday forever.



Do not change this immediately without first assessing product behavior and migration consequences.



\## 12.7 `run\_reports`



Purpose: allow users to report inaccurate run information.



Known report types:



\* `no\_one\_there`

\* `wrong\_time`

\* `closed\_location`



Known fields:



\* `id`

\* `user\_id`

\* `run\_id`

\* `report\_type`

\* `created\_at`



Users can insert their own reports and read their own reports.



Official moderation and report-review tooling was not confirmed as implemented.



\---



\# 13. Row Level Security expectations



RLS was enabled for the core tables.



Expected security model:



\* Venues are publicly readable.

\* Runs are publicly readable.

\* Users can only manage their own profile.

\* Users can only manage their own saved venues.

\* Users can only manage their own saved runs.

\* Users can only manage their own attendance rows.

\* Users can only submit reports as themselves.

\* Normal users cannot directly create or edit official venue and run records.

\* Administrative or service-role operations should remain server-side or securely controlled.



Never expose the Supabase service-role key in the React Native app.



The mobile client should only use the anonymous public key.



Any privileged ingestion or moderation work must occur in a secure backend, Edge Function, protected admin interface, trusted script, or controlled manual database process.



\---



\# 14. Data-access architecture



The project uses a thin query layer.



Known query files include:



```text

src/lib/queries/venues.ts

src/lib/queries/runs.ts

```



Known functions or approximate equivalents include:



\* `fetchVenues()`

\* `fetchVenueById()`

\* `fetchRuns()`

\* `fetchRunById()`

\* `fetchRunsByVenueId()`



Mapping functions include approximate equivalents of:



\* `mapVenueRow()`

\* `mapRunRow()`



Their purpose is to convert Supabase database rows into the app’s frontend interfaces.



React hooks include:



\* `useVenues()`

\* `useRuns()`



The hooks reportedly expose:



\* Data

\* Loading state

\* Error

\* Refetch



At the last documented point, screens used the data and loading state, but did not consistently display the error field to users.



\---



\# 15. Development history and completed work



The exact details of the earliest UI phases are not fully preserved in this handoff. Do not invent Phase 1, Phase 2, Phase 4, or Phase 6 completion details. Inspect git history, existing files, comments, and prior status documents where available.



The following work is documented.



\## 15.1 UI foundation existing before Phase 3



Before the location and backend phases, the app already had a visual frontend containing major screens and reusable components.



It included some mock venue, run, popularity, weather, and chat data.



Some UI features looked complete visually but were not connected to real backend behavior.



\## 15.2 Phase 3: location, distance, local saves, directions, and live schedule logic



Phase 3 was reported as substantially complete.



Implemented work included:



\### Real user location



\* Foreground location permission request

\* Initial GPS fix

\* Continued position watching

\* Provider integrated near the top of the component tree

\* Map centering on the first valid location

\* Continental United States fallback when location was unavailable

\* Locating state

\* Locate/recenter button fix



\### Real distance calculations



A Haversine distance helper was added.



Reported usage included:



\* Venue cards

\* Recurring run cards

\* Map preview cards

\* Home screen sorting

\* Explore screen sorting



Distances are calculated in miles.



When coordinates are unavailable, the app previously used a mock fallback distance.



\### Venue save persistence



Saved venues were connected to `SavedContext`.



The implementation used:



\* A `Set` of IDs

\* Optimistic updates

\* AsyncStorage

\* Loading on mount

\* Persistent local state across sessions



At this phase, saves were device-local rather than user-account synced.



\### Directions



The Venue Detail screen gained a directions action.



Reported behavior:



\* Try Apple Maps through `maps://` where supported

\* Otherwise use a Google Maps web URL

\* Encode the venue address as the destination query



\### Real “Open Now” logic



The app replaced an earlier fake popularity-based “Open Now” condition.



A utility compared the current day and time against run schedules.



Possible status labels included:



\* `Open Now`

\* `Tonight Xpm`

\* `Runs Weekly`



The Home screen’s `open\_now` filter used this schedule logic.



\## 15.3 Phase 5: Supabase backend, authentication, and real venue/run queries



Phase 5 was reported as partially complete but successful for its main backend goals.



Completed work included:



\* Typed Supabase client

\* Environment-variable wiring

\* Database schema

\* RLS policies

\* Automatic profile trigger

\* TypeScript database definitions

\* Email/password sign-up

\* Email/password sign-in

\* Sign-out

\* Session persistence

\* Auth-state handling

\* Token refresh

\* Profile row loading

\* Sign-in screen

\* Sign-up screen

\* Auth-aware Profile tab

\* Venue query layer

\* Run query layer

\* React data hooks

\* Supabase seed data

\* Real venue data on Home

\* Real run data on Home

\* Real data in Explore

\* Real venue filtering in Saved

\* Async Venue Detail loading

\* Async Run Detail loading

\* Navigation between runs and venues

\* Loading spinners



The seed database reportedly contained approximately:



\* 8 venues

\* 15 run rows



Confirm the current values in the real database.



The five main venue/run display screens were reported as no longer importing the primary mock venue and recurring-run datasets.



\---



\# 16. Features that were visually present but not fully connected



The previous frontend contained UI for functionality that had not yet been connected to backend writes.



This distinction is essential.



A button existing in the UI does not mean its feature works.



Known examples include:



\* “Count Me In”

\* “I’m Going”

\* Run bookmarks

\* Profile preferences

\* Group chat preview

\* Popularity information

\* Live conditions

\* Weather badges

\* Best-times information



Some actions only displayed an `Alert.alert` placeholder.



Some sections silently hid themselves because mock-data lookup failed for Supabase UUIDs.



Always trace the actual event handler and data source before claiming a feature is complete.



\---



\# 17. Last reliably documented incomplete features



The following items were incomplete in the last detailed status report.



\## 17.1 Saved venues were not account-synced



Venue saves were stored locally in AsyncStorage under a key similar to:



```text

@pickup/saved\_venues

```



Consequences:



\* Saves were per device.

\* A user signing into another device would not see them.

\* Signing in did not migrate local saves into `saved\_venues`.

\* The existing `saved\_venues` table was not being used by the client.



\## 17.2 Saved runs were not implemented



The `saved\_runs` table existed, but the frontend was not writing to it.



At different earlier points, the runs section may have used hardcoded sample IDs or shown an empty state.



Verify the current code.



\## 17.3 Attendance writes were not implemented



The `run\_attendance` table existed.



However:



\* “Count Me In” was reportedly an alert stub.

\* “I’m Going” on Venue Detail was reportedly an alert stub.

\* No confirmed insert, upsert, update, or delete behavior existed.

\* No confirmed attendance count query existed.



\## 17.4 Profile preferences did not persist



The Profile screen reportedly had controls for:



\* Sports

\* Skill level

\* Radius

\* Notifications



But the values were held in screen-level state.



They did not reliably:



\* Read from `PrefsContext`

\* Read from `profiles`

\* Write to `profiles`

\* Persist between restarts



\## 17.5 Profile editing was incomplete



No confirmed full editing flow existed for:



\* `full\_name`

\* `username`

\* `avatar\_url`

\* `sports`

\* `skill\_level`

\* `indoor\_outdoor`



\## 17.6 Password reset was not implemented



No confirmed:



\* Forgot-password screen

\* `resetPasswordForEmail` flow

\* Deep-link recovery flow

\* Password update screen



\## 17.7 OAuth was not implemented



No confirmed Google, Apple, or other OAuth providers.



Do not add OAuth before core account and data behavior is stable unless I request it.



\## 17.8 No refetch on screen focus



Data reportedly loaded on mount but did not automatically refetch when a screen regained focus.



If backend data changed while the application stayed open, the UI could remain stale until restart or manual refetch.



\## 17.9 User-facing network errors were missing



The hooks exposed errors, but screens often turned failed requests into empty lists.



A user might interpret a failed network request as “no venues exist.”



\## 17.10 Home screen search was nonfunctional



The Home screen reportedly stored `searchQuery`, but its filtering logic did not use the query.



Explore search reportedly worked.



\## 17.11 Location-denied feedback was weak



If location permission was denied:



\* The map used a broad United States fallback.

\* Distances could use fake fallback values.

\* The locate button could do nothing.

\* No clear permission explanation or recovery action was shown.



\## 17.12 Hardcoded tab-bar sizing



A value similar to this was used:



```ts

Platform.OS === 'ios' ? 86 : 62

```



This may not properly account for all safe-area configurations.



\## 17.13 Address-based directions



Directions used a human-readable address query rather than exact latitude and longitude.



This is acceptable but may be less precise.



\---



\# 18. Known placeholder data and mapping issues



\## 18.1 Hardcoded run values



`mapRunRow()` reportedly supplied defaults for fields not yet represented in the schema.



Examples:



\* `typicalTurnout`

\* `popularityScore`

\* `isVerified`



This could cause every run to display the same information.



Do not present those values as real user or backend data.



\## 18.2 Hardcoded venue type



`mapVenueRow()` reportedly set:



```text

venueType = "rec\_center"

```



for every venue.



The value was not heavily used at the time but would become incorrect if venue-type filtering were added.



\## 18.3 Derived short names



A venue `shortName` was generated from approximately the first two words of the venue’s full name.



This may produce awkward labels.



\## 18.4 Mock fallback distance



When GPS was unavailable, `mockDistance()` reportedly returned approximately `2.0 mi` for Supabase UUIDs.



This is misleading and should eventually be replaced with:



\* Unknown distance

\* Permission-required messaging

\* Manual location selection

\* A city-based default

\* Or another truthful fallback



Do not display fabricated precision.



\## 18.5 Mock conditions



`MOCK\_CONDITIONS` was still referenced by screens such as:



\* Home

\* Explore

\* Saved

\* Venue Detail



Supabase UUIDs did not match the old mock-data IDs, so weather-related sections often returned `undefined` and did not render.



\## 18.6 Mock popularity



`MOCK\_POPULARITY` was still referenced in Venue Detail.



The “Right Now” and “Best Times” sections often did not render for real Supabase venues.



\## 18.7 Mock chat rooms



`MOCK\_CHAT\_ROOMS` was referenced in Venue Detail and Run Detail.



Because the new venue IDs did not match mock IDs, the chat preview generally stayed hidden.



Chat is not a core priority and should not distract from data quality and discovery.



\---



\# 19. Schedule and venue data ingestion problem



The largest long-term operational challenge is not merely building the app interface.



It is acquiring and maintaining accurate pickup-sports data.



The app needs a repeatable process to:



1\. Find official or trustworthy schedule sources.

2\. Extract potential pickup runs.

3\. Normalize the data.

4\. Preserve the original source.

5\. Flag ambiguous information.

6\. Match the run to a venue.

7\. Review it.

8\. Publish it to the official `runs` table.

9\. Recheck the source later.

10\. Detect outdated or changed schedules.



Possible source types include:



\* Official facility webpage

\* HTML schedule table

\* PDF schedule

\* Recreation-center calendar

\* YMCA program page

\* University recreation page

\* Social-media post

\* User-submitted evidence

\* Direct facility confirmation



\---



\# 20. Later Phase 7 ingestion experiment



A later document explored a manual or AI-assisted ingestion pipeline.



It used a proposed or experimental table called:



```text

run\_candidates

```



The purpose was to separate raw discovered schedule information from trusted public run records.



A candidate could contain fields such as:



\* `venue\_id`

\* `title`

\* `sport\_id`

\* `day\_of\_week`

\* `start\_time`

\* `end\_time`

\* `skill\_level`

\* `is\_indoor`

\* `notes`

\* `source\_url`

\* `source\_name`

\* `source\_type`

\* `raw\_text`

\* `extracted\_json`

\* `confidence\_score`

\* `needs\_review`

\* `review\_status`

\* `last\_seen\_at`



The example workflow used an imaginary or test YMCA schedule containing both:



\* Structured HTML schedule rows

\* Unstructured prose descriptions



The extraction logic preserved:



\* Original text

\* Parsed structured output

\* Confidence score

\* Ambiguities

\* Inference notes

\* Review requirement

\* Source URL



Example confidence patterns:



\* Explicit single-day table row with exact time: high confidence

\* Combined “Wed/Fri” row split into two candidates: medium confidence and review required

\* Prose saying “Tuesday and Thursday from around 7 PM to closing”: low confidence because the end time was inferred



This is a good product direction because the public `runs` table should contain reviewed data rather than raw AI guesses.



However, do not assume this system is live.



Before building on it, verify:



\* Whether `run\_candidates` exists in the current Supabase project

\* Whether its migration exists in the repository

\* Whether RLS exists for it

\* Whether approval functions exist

\* Whether candidates can be promoted into `runs`

\* Whether an admin interface exists

\* Whether source checking is automated

\* Whether the example SQL was only a concept demonstration



Treat the ingestion experiment as a promising design unless the actual code and database prove that it is implemented.



\---



\# 21. Recommended future ingestion architecture



When continuing this area, preserve a human-review layer.



A safe pipeline would look like:



```text

Source discovery

&#x20;   ↓

Source retrieval

&#x20;   ↓

Text/table/PDF extraction

&#x20;   ↓

Structured AI extraction

&#x20;   ↓

Validation and normalization

&#x20;   ↓

run\_candidates

&#x20;   ↓

Human review

&#x20;   ↓

Venue matching or creation

&#x20;   ↓

Approval

&#x20;   ↓

Official runs table

&#x20;   ↓

Periodic re-verification

```



Important principles:



\* Never silently invent missing times.

\* Preserve exact source text.

\* Mark inferred fields.

\* Assign confidence conservatively.

\* Split multi-day schedules carefully.

\* Keep source URL and source name.

\* Record when the source was last checked.

\* Require review for uncertain records.

\* Do not let an LLM directly publish unverified public data.

\* Avoid duplicate venues and duplicate runs.

\* Support deactivation when a source disappears.

\* Maintain an audit trail.



\---



\# 22. Last recorded runtime problem



The latest preserved runtime error I have is a Metro/Expo startup failure from a Windows development environment.



Project path at the time:



```text

C:\\Users\\Micha\\OneDrive\\Desktop\\PickUp\\pickup

```



Recorded error:



```text

Error: Cannot find module './index.flow'

```



The require stack involved:



```text

metro-config

metro

@expo/metro

expo CLI

```



This may indicate:



\* Corrupted `node\_modules`

\* Conflicting Metro package versions

\* An interrupted dependency installation

\* Expo/Metro version mismatch

\* OneDrive synchronization interfering with files

\* Lockfile inconsistency

\* Package-manager mismatch



Do not assume this problem still exists.



First run the app and reproduce the current issue.



If it does exist, diagnose it systematically before changing application code:



1\. Inspect `package.json`.

2\. Identify whether npm, Yarn, or pnpm is intended.

3\. Inspect the lockfile.

4\. Run Expo dependency compatibility checks.

5\. Inspect installed Metro versions.

6\. Remove only generated dependency artifacts when appropriate.

7\. Reinstall with the correct package manager.

8\. Clear the Expo and Metro caches.

9\. Consider moving the project outside OneDrive if file synchronization caused corruption.

10\. Avoid random package upgrades that could create more incompatibilities.



Do not delete source files or rewrite the project to solve a dependency-installation issue.



\---



\# 23. Current-state truth hierarchy



When determining what is actually complete, use this order of trust:



1\. Running application behavior

2\. Current source code

3\. Current Supabase schema and data

4\. Current package configuration

5\. Current migrations

6\. Git history

7\. Recent technical status reports

8\. README or product overview

9\. Old mock UI

10\. Roadmap descriptions



The high-level README sometimes describes the intended final architecture as if all features exist.



The detailed Phase 5 status report is more conservative and says synced saves, attendance, profile persistence, and several writes were not finished.



Use actual code as the final source of truth.



\---



\# 24. Suggested immediate priorities



Unless the repository shows these tasks are already finished, prioritize work approximately as follows.



\## Priority 0: restore a stable development environment



\* Make the project start reliably.

\* Resolve Metro or package problems.

\* Confirm iOS, Android, or Expo Go behavior.

\* Confirm TypeScript compilation.

\* Document the exact working commands.



\## Priority 1: audit the existing project



Create a factual status report covering:



\* Working screens

\* Broken screens

\* Mock data still used

\* Real Supabase reads

\* Real Supabase writes

\* Auth behavior

\* Save behavior

\* Attendance behavior

\* Preference persistence

\* Location behavior

\* Database tables

\* RLS policies

\* Environment variables

\* Current errors

\* TypeScript errors

\* Package compatibility



Do this before rewriting anything.



\## Priority 2: finish authenticated saved data



Implement:



\* Load saved venues from Supabase when authenticated.

\* Load saved runs from Supabase when authenticated.

\* Use AsyncStorage for guests.

\* Preserve optimistic UI.

\* Roll back on errors.

\* Define guest-to-account migration behavior.

\* Prevent duplicates.

\* Keep the Saved screen accurate.



\## Priority 3: complete attendance correctly



Before implementation, decide whether attendance means:



\* Attending every recurrence

\* Attending the next occurrence

\* Attending a particular calendar date



The best long-term model is probably occurrence-based attendance.



Do not lock the product into an incorrect recurring-attendance model without analysis.



Then implement:



\* Attendance upsert

\* Attendance removal

\* Current-user status

\* Aggregate counts

\* Loading states

\* Error handling

\* Optimistic UI

\* Appropriate RLS



\## Priority 4: persist profile preferences



Connect the Profile and onboarding interfaces to real state.



Ensure:



\* Initial loading from `profiles`

\* Updates to Supabase

\* Local fallback for guests

\* Session transitions

\* Clear save feedback

\* Validation

\* No reset on restart



\## Priority 5: truthful errors and empty states



Differentiate:



\* No results

\* Loading

\* Network failure

\* Location unavailable

\* Permission denied

\* Database configuration failure

\* Authentication required



Never silently convert every failure into an empty list.



\## Priority 6: remove misleading mock behavior



Replace or clearly disable:



\* Fake distances

\* Fake popularity

\* Fake turnout

\* Fake verification

\* Hidden mock chat

\* Nonfunctional buttons

\* Weather sections with no real source



It is better to show “Not available yet” than fabricated information.



\## Priority 7: trust, reports, and freshness



Build:



\* Run reporting

\* Last verified time

\* Source display

\* Report aggregation

\* Admin review

\* Stale-run handling

\* Verification workflows



\## Priority 8: ingestion pipeline



After core user behavior is stable, build:



\* Candidate schema

\* Source ingestion

\* Duplicate detection

\* Review interface

\* Approval workflow

\* Re-verification jobs

\* Audit history



\---



\# 25. Longer-term roadmap



Potential future features include:



\* Real weather API integration

\* Weather warnings for outdoor games

\* Push notifications for saved runs

\* Reminders for runs a user plans to attend

\* Supabase Realtime attendance counts

\* Live occupancy estimates

\* User run suggestions

\* Run submission flow

\* Moderator review interface

\* Report review dashboard

\* “Last verified X days ago”

\* Crowd-confirmed turnout

\* Map activity heatmap

\* QR sharing for venues or runs

\* Offline saved-venue access

\* Expo web version

\* AI-assisted PDF schedule extraction

\* YMCA partnerships

\* Recreation-center partnerships

\* College-campus partnerships

\* Facility dashboards

\* Official venue ownership or verification



These are roadmap items, not permission to build everything immediately.



Prioritize data accuracy, core discovery, and stable user behavior.



\---



\# 26. Business and growth considerations



Pick-Up faces a marketplace-style cold-start problem.



The app needs enough high-quality local schedule data before users receive value.



A practical launch strategy may be:



1\. Select one geographic area.

2\. Focus on one sport, probably basketball.

3\. Manually collect reliable recurring runs.

4\. Verify venues and schedules.

5\. Launch with dense local coverage.

6\. Gather attendance and accuracy feedback.

7\. Expand into nearby areas.

8\. Add additional sports.

9\. Partner with facilities after proving usage.



Data density is more important than broad but empty geographic coverage.



Ten trustworthy nearby runs are more useful than thousands of incomplete or unverified nationwide records.



\---



\# 27. Coding and collaboration expectations



When working on this repository:



\* Inspect before editing.

\* Preserve working code.

\* Avoid unnecessary rewrites.

\* Do not change the technology stack casually.

\* Keep TypeScript strict.

\* Avoid `any` unless unavoidable and documented.

\* Keep database types synchronized with the real schema.

\* Do not expose secrets.

\* Preserve RLS.

\* Use small, reviewable changes.

\* Explain migrations before applying them.

\* Consider backward compatibility.

\* Add loading and error states.

\* Check both authenticated and guest flows.

\* Check both location-granted and location-denied flows.

\* Check both empty and populated databases.

\* Avoid presenting placeholders as real data.

\* Do not claim a feature works without tracing its full read/write path.

\* Do not add social features that conflict with the utility-first vision.

\* Do not confuse recurring runs with dated occurrences.

\* Ask before making large product changes.

\* Prefer simple, maintainable code over unnecessary abstraction.



\---



\# 28. How I want you to begin



Start by inspecting the project rather than immediately generating large amounts of replacement code.



Your first response after receiving the repository should include:



\## A. Product understanding



Summarize in your own words:



\* What Pick-Up is

\* The main user problem

\* The core user journey

\* What the product is not

\* Why data trust matters



\## B. Repository audit



Report:



\* Current Expo version

\* Current React Native version

\* Package manager

\* Available scripts

\* Navigation structure

\* Context providers

\* Screens

\* Query layer

\* Supabase configuration

\* Database schema

\* Mock data still used

\* Current TypeScript errors

\* Current runtime error

\* Whether the app starts



\## C. Feature truth table



For each feature, label it:



\* Complete and working

\* Partially implemented

\* UI only

\* Mock only

\* Broken

\* Not implemented

\* Unable to verify



Include at least:



\* Map

\* GPS

\* Distance

\* Explore search

\* Home search

\* Venue details

\* Run details

\* Directions

\* Authentication

\* Venue saves

\* Run saves

\* Attendance

\* Preferences

\* Reports

\* Weather

\* Popularity

\* Verification

\* Ingestion pipeline

\* Error handling



\## D. Database truth table



For each relevant table, state:



\* Whether it exists

\* Whether frontend reads from it

\* Whether frontend writes to it

\* Whether RLS is enabled

\* Whether policies appear correct

\* Whether generated or handwritten TypeScript types match it



\## E. Immediate repair plan



Propose a short ordered plan based on the actual repository.



Do not start a major rewrite until the audit is complete.



\---



\# 29. Critical questions to verify from the repository



Answer these based on evidence:



1\. Does the app currently start?

2\. Is the Metro `index.flow` error still present?

3\. Which lockfile exists?

4\. Are Expo dependencies compatible?

5\. Does the Supabase environment configuration load correctly?

6\. Are venues and runs coming from the live database?

7\. Are venue saves still local-only?

8\. Are run saves implemented?

9\. Does attendance perform a real database write?

10\. Do profile preferences persist?

11\. Does the Home search actually filter results?

12\. Do screens display network errors?

13\. Are distances ever fabricated?

14\. Are popularity and turnout values hardcoded?

15\. Is `run\_reports` used by the app?

16\. Does `run\_candidates` exist?

17\. Is there an approval process for candidate runs?

18\. Are there migrations beyond `schema.sql`?

19\. Are privileged database keys stored anywhere unsafe?

20\. Does the current schema distinguish recurring runs from dated occurrences?



\---



\# 30. Final guiding principle



The heart of Pick-Up is not a social feed, a polished mockup, or a large list of planned features.



The heart of Pick-Up is:



> Reliable information about where and when people can actually play pickup sports.



Every technical and product decision should support that outcome.



The best version of the app lets someone open it in an unfamiliar area, find a trustworthy game nearby, understand what to expect, get directions, and confidently show up to play.



