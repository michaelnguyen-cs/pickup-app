-- seed.sql — development seed data for Pick-Up
-- Run this after schema.sql to populate the app with realistic venues and runs.
--
-- Venue UUIDs: a0a0a0a0-0000-0000-0000-00000000000N  (N = 1–8)
-- Run UUIDs:   b0b0b0b0-0000-0000-0000-00000000000N  (N = 1–7)
--
-- Each run row is one time slot. The app's mapRunRow() wraps each row into a
-- RecurringRun with a single-entry schedule[], which is all getVenueStatusBadge()
-- needs to determine open/upcoming status.

-- ── Venues ───────────────────────────────────────────────────────────────────

INSERT INTO venues (id, name, sport_id, address, city, state, latitude, longitude, image_url, is_indoor, description, popularity_score)
VALUES
  (
    'a0a0a0a0-0000-0000-0000-000000000001',
    'Rucker Park',
    'basketball',
    'Harlem River Dr & 155th St',
    'New York, NY',
    'NY',
    40.8284,
    -73.9343,
    'https://images.unsplash.com/photo-1546519638405-a5ce24a500e8?w=800',
    false,
    'Legendary NYC outdoor basketball court. Historic pickup runs every evening. Competitive level, bring your A game.',
    97
  ),
  (
    'a0a0a0a0-0000-0000-0000-000000000002',
    'UCLA John Wooden Center',
    'basketball',
    '221 Westwood Plaza',
    'Los Angeles, CA',
    'CA',
    34.0699,
    -118.4432,
    'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800',
    true,
    'Full-service university rec center with open gym hours daily. Student and community access available.',
    88
  ),
  (
    'a0a0a0a0-0000-0000-0000-000000000003',
    'Lincoln Park Running Trail',
    'running',
    'N Cannon Dr',
    'Chicago, IL',
    'IL',
    41.9214,
    -87.6347,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    false,
    'Miles of lakefront running path. Popular morning run groups meet here daily. Sunset runs are a local staple.',
    84
  ),
  (
    'a0a0a0a0-0000-0000-0000-000000000004',
    'Downtown YMCA',
    'basketball',
    '1401 Lavaca St',
    'Austin, TX',
    'TX',
    30.2737,
    -97.7430,
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    true,
    'Full gym with two basketball courts and open swim lanes. Open gym runs Monday through Friday evenings.',
    79
  ),
  (
    'a0a0a0a0-0000-0000-0000-000000000005',
    'Venice Beach Courts',
    'volleyball',
    '1800 Ocean Front Walk',
    'Los Angeles, CA',
    'CA',
    33.9850,
    -118.4695,
    'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800',
    false,
    'Iconic outdoor courts on the boardwalk. Beach volleyball and basketball every weekend. Casual to competitive.',
    92
  ),
  (
    'a0a0a0a0-0000-0000-0000-000000000006',
    'Millennium Park Rec Courts',
    'pickleball',
    '201 E Randolph St',
    'Chicago, IL',
    'IL',
    41.8826,
    -87.6226,
    'https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=800',
    false,
    'Free public tennis and pickleball courts in the heart of downtown. First-come first-served. Busy on weekends.',
    73
  ),
  (
    'a0a0a0a0-0000-0000-0000-000000000007',
    'University of Houston Rec Center',
    'volleyball',
    '4800 Calhoun Rd',
    'Houston, TX',
    'TX',
    29.7199,
    -95.3422,
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    true,
    'Large campus rec center with daily open gym. Basketball draws a strong evening crowd. Community members welcome.',
    82
  ),
  (
    'a0a0a0a0-0000-0000-0000-000000000008',
    'Flushing Meadows Tennis Center',
    'tennis',
    'Flushing Meadows Corona Park',
    'New York, NY',
    'NY',
    40.7499,
    -73.8465,
    'https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=800',
    false,
    'Public tennis complex with both indoor and outdoor courts. Reservations available online. Open play slots on weekday mornings.',
    76
  )
ON CONFLICT (id) DO NOTHING;


-- ── Runs ─────────────────────────────────────────────────────────────────────
-- One row = one recurring time slot. Multiple rows per venue are fine and expected.

INSERT INTO runs (id, venue_id, title, sport_id, day_of_week, start_time, end_time, skill_level, is_indoor, notes)
VALUES
  -- Rucker Park Evening Runs (basketball, outdoor, competitive)
  (
    'b0b0b0b0-0000-0000-0000-000000000001',
    'a0a0a0a0-0000-0000-0000-000000000001',
    'Rucker Park Evening Runs',
    'basketball',
    'fri',
    '18:00',
    '21:30',
    'competitive',
    false,
    'The original NYC outdoor pickup. Runs kick off around sunset and go until dark. Bring your game — competition is real.'
  ),
  (
    'b0b0b0b0-0000-0000-0000-00000000000a',
    'a0a0a0a0-0000-0000-0000-000000000001',
    'Rucker Park Evening Runs',
    'basketball',
    'mon',
    '18:00',
    '21:00',
    'competitive',
    false,
    'The original NYC outdoor pickup. Runs kick off around sunset and go until dark. Bring your game — competition is real.'
  ),
  (
    'b0b0b0b0-0000-0000-0000-00000000000b',
    'a0a0a0a0-0000-0000-0000-000000000001',
    'Rucker Park Evening Runs',
    'basketball',
    'sat',
    '10:00',
    '14:00',
    'competitive',
    false,
    'Weekend morning runs at Rucker. Show up early — courts fill fast.'
  ),

  -- UCLA Open Gym (basketball, indoor, intermediate)
  (
    'b0b0b0b0-0000-0000-0000-000000000002',
    'a0a0a0a0-0000-0000-0000-000000000002',
    'UCLA Open Gym — Weekday Runs',
    'basketball',
    'mon',
    '18:00',
    '21:00',
    'intermediate',
    true,
    'Daily open gym during the academic year. Full-court and half-court pickup. Mixed skill levels, mostly intermediate.'
  ),
  (
    'b0b0b0b0-0000-0000-0000-00000000000c',
    'a0a0a0a0-0000-0000-0000-000000000002',
    'UCLA Open Gym — Weekday Runs',
    'basketball',
    'wed',
    '18:00',
    '21:00',
    'intermediate',
    true,
    'Daily open gym during the academic year. Full-court and half-court pickup. Mixed skill levels, mostly intermediate.'
  ),
  (
    'b0b0b0b0-0000-0000-0000-00000000000d',
    'a0a0a0a0-0000-0000-0000-000000000002',
    'UCLA Open Gym — Weekday Runs',
    'basketball',
    'fri',
    '11:00',
    '13:00',
    'intermediate',
    true,
    'Midday open gym on Fridays. Less crowded than evenings.'
  ),

  -- YMCA Evening Pickup Austin (basketball, indoor, mixed)
  (
    'b0b0b0b0-0000-0000-0000-000000000003',
    'a0a0a0a0-0000-0000-0000-000000000004',
    'YMCA Evening Pickup — Austin',
    'basketball',
    'tue',
    '19:00',
    '21:00',
    'mixed',
    true,
    'Well-organized weekly runs at the downtown Y. Consistent group, all welcome. 5-on-5 full court, rotating teams.'
  ),
  (
    'b0b0b0b0-0000-0000-0000-00000000000e',
    'a0a0a0a0-0000-0000-0000-000000000004',
    'YMCA Evening Pickup — Austin',
    'basketball',
    'thu',
    '19:00',
    '21:00',
    'mixed',
    true,
    'Well-organized weekly runs at the downtown Y. Consistent group, all welcome. 5-on-5 full court, rotating teams.'
  ),

  -- Venice Beach Volleyball (volleyball, outdoor, casual)
  (
    'b0b0b0b0-0000-0000-0000-000000000004',
    'a0a0a0a0-0000-0000-0000-000000000005',
    'Venice Beach Volleyball',
    'volleyball',
    'sat',
    '09:00',
    '14:00',
    'casual',
    false,
    'Sand and hardcourt volleyball every weekend morning. Show up and get in line. Usually 4–6 courts running.'
  ),
  (
    'b0b0b0b0-0000-0000-0000-00000000000f',
    'a0a0a0a0-0000-0000-0000-000000000005',
    'Venice Beach Volleyball',
    'volleyball',
    'sun',
    '09:00',
    '14:00',
    'casual',
    false,
    'Sunday morning beach volleyball at Venice. Laid back, all levels welcome.'
  ),

  -- Lincoln Park Morning Run Group (running, outdoor, beginner)
  (
    'b0b0b0b0-0000-0000-0000-000000000005',
    'a0a0a0a0-0000-0000-0000-000000000003',
    'Lincoln Park Morning Run Group',
    'running',
    'sat',
    '07:00',
    '08:30',
    'beginner',
    false,
    'Casual 5K lakefront run. Meets at the Cannon Drive entrance. All paces welcome. Usually 10–20 runners.'
  ),
  (
    'b0b0b0b0-0000-0000-0000-000000000010',
    'a0a0a0a0-0000-0000-0000-000000000003',
    'Lincoln Park Morning Run Group',
    'running',
    'tue',
    '06:30',
    '07:30',
    'beginner',
    false,
    'Tuesday morning lakefront run. Shorter loop, great for weekday mileage.'
  ),

  -- Millennium Park Pickleball (pickleball, outdoor, mixed)
  (
    'b0b0b0b0-0000-0000-0000-000000000006',
    'a0a0a0a0-0000-0000-0000-000000000006',
    'Millennium Park Pickleball',
    'pickleball',
    'sat',
    '08:00',
    '12:00',
    'mixed',
    false,
    'Growing pickleball scene in downtown Chicago. Open play daily. Paddles provided on weekends for new players.'
  ),
  (
    'b0b0b0b0-0000-0000-0000-000000000011',
    'a0a0a0a0-0000-0000-0000-000000000006',
    'Millennium Park Pickleball',
    'pickleball',
    'wed',
    '07:00',
    '10:00',
    'mixed',
    false,
    'Midweek morning pickleball at Millennium. Smaller crowd, great for beginners.'
  ),

  -- UH Open Volleyball (volleyball, indoor, intermediate)
  (
    'b0b0b0b0-0000-0000-0000-000000000007',
    'a0a0a0a0-0000-0000-0000-000000000007',
    'UH Open Volleyball',
    'volleyball',
    'wed',
    '20:00',
    '22:00',
    'intermediate',
    true,
    'Coed open volleyball at the UH Rec Center. Indoor courts. Consistent crowd, competitive but welcoming.'
  ),
  (
    'b0b0b0b0-0000-0000-0000-000000000012',
    'a0a0a0a0-0000-0000-0000-000000000007',
    'UH Open Volleyball',
    'volleyball',
    'fri',
    '19:00',
    '21:00',
    'intermediate',
    true,
    'Friday night volleyball at UH. Good energy, rotating teams.'
  )
ON CONFLICT (id) DO NOTHING;
