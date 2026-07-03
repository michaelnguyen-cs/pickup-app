// Database type definitions — matches the Supabase schema exactly
// Format mirrors what `supabase gen types typescript` outputs so it's
// compatible with createClient<Database>() and supabase.from<T>() calls.
//
// Row    — shape returned by SELECT
// Insert — shape for INSERT (fields with DB defaults are optional)
// Update — shape for UPDATE (all fields optional)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;                       // uuid — same as auth.users.id
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          sports: Json | null;              // jsonb — array of sport IDs e.g. ["basketball","soccer"]
          skill_level: string | null;       // 'beginner'|'casual'|'intermediate'|'competitive'|'mixed'
          indoor_outdoor: string | null;    // 'indoor'|'outdoor'|'both'
          age_confirmed: boolean;           // true once user has confirmed they are 16+
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          sports?: Json | null;
          skill_level?: string | null;
          indoor_outdoor?: string | null;
          age_confirmed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          sports?: Json | null;
          skill_level?: string | null;
          indoor_outdoor?: string | null;
          age_confirmed?: boolean;
          created_at?: string;
        };
      };

      venues: {
        Row: {
          id: string;
          name: string;
          sport_id: string;                 // primary sport — legacy single-sport field
          address: string;
          city: string;
          state: string;
          latitude: number;
          longitude: number;
          image_url: string | null;
          is_indoor: boolean;
          description: string | null;
          popularity_score: number;         // 0–100
          created_at: string;
          // Phase 6 columns
          venue_type: string | null;        // matches TypeScript VenueType
          sports: string[] | null;          // all sports at this venue; backfilled from sport_id
          is_blocked: boolean;              // true = Tier 3 / private; create_run RPC rejects
          reservation_policy: string | null; // 'required'|'peak_only'|'recommended'|'first_come'
          reservation_url: string | null;
          busy_hours_note: string | null;
          // Phase 14 column — null for manually-created/seed venues, else
          // 'google_places' | 'overpass_osm'.
          import_source: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          sport_id: string;
          address: string;
          city: string;
          state: string;
          latitude: number;
          longitude: number;
          image_url?: string | null;
          is_indoor?: boolean;
          description?: string | null;
          popularity_score?: number;
          created_at?: string;
          venue_type?: string | null;
          sports?: string[] | null;
          is_blocked?: boolean;
          reservation_policy?: string | null;
          reservation_url?: string | null;
          busy_hours_note?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          sport_id?: string;
          address?: string;
          city?: string;
          state?: string;
          latitude?: number;
          longitude?: number;
          image_url?: string | null;
          is_indoor?: boolean;
          description?: string | null;
          popularity_score?: number;
          created_at?: string;
          venue_type?: string | null;
          sports?: string[] | null;
          is_blocked?: boolean;
          reservation_policy?: string | null;
          reservation_url?: string | null;
          busy_hours_note?: string | null;
        };
      };

      runs: {
        Row: {
          id: string;
          venue_id: string;
          title: string;
          sport_id: string;
          day_of_week: string;              // 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'
          start_time: string;               // 'HH:MM' 24h
          end_time: string;                 // 'HH:MM' 24h
          skill_level: string;
          is_indoor: boolean;
          notes: string | null;
          created_at: string;
          // Phase 7 provenance + trust fields (added via migration)
          source_url: string | null;
          source_type: string;              // 'manual'|'admin'|'ai_extracted'|'ai_assisted'
          confidence_score: number | null;  // 0.00–1.00; null = manually verified (implicit 1.0)
          last_verified_at: string | null;
          verification_method: string | null;
          // Phase 16 seasonality columns
          is_seasonal: boolean;
          season_start_month: number | null; // 1-12
          season_end_month: number | null;   // 1-12; may be < season_start_month (wraps new year)
          season_notes: string | null;
        };
        Insert: {
          id?: string;
          venue_id: string;
          title: string;
          sport_id: string;
          day_of_week: string;
          start_time: string;
          end_time: string;
          skill_level?: string;
          is_indoor?: boolean;
          notes?: string | null;
          created_at?: string;
          source_url?: string | null;
          source_type?: string;
          confidence_score?: number | null;
          last_verified_at?: string | null;
          verification_method?: string | null;
          is_seasonal?: boolean;
          season_start_month?: number | null;
          season_end_month?: number | null;
          season_notes?: string | null;
        };
        Update: {
          id?: string;
          venue_id?: string;
          title?: string;
          sport_id?: string;
          day_of_week?: string;
          start_time?: string;
          end_time?: string;
          skill_level?: string;
          is_indoor?: boolean;
          notes?: string | null;
          created_at?: string;
          source_url?: string | null;
          source_type?: string;
          confidence_score?: number | null;
          last_verified_at?: string | null;
          verification_method?: string | null;
          is_seasonal?: boolean;
          season_start_month?: number | null;
          season_end_month?: number | null;
          season_notes?: string | null;
        };
      };

      saved_venues: {
        Row: {
          user_id: string;
          venue_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          venue_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          venue_id?: string;
          created_at?: string;
        };
      };

      saved_runs: {
        Row: {
          user_id: string;
          run_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          run_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          run_id?: string;
          created_at?: string;
        };
      };

      run_attendance: {
        Row: {
          user_id: string;
          run_id: string;
          status: string;                   // 'attending'|'maybe'|'not_attending'
          created_at: string;
        };
        Insert: {
          user_id: string;
          run_id: string;
          status: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          run_id?: string;
          status?: string;
          created_at?: string;
        };
      };

      run_candidates: {
        Row: {
          id: string;
          venue_id: string | null;
          title: string;
          sport_id: string;
          day_of_week: string;
          start_time: string;
          end_time: string;
          skill_level: string;
          is_indoor: boolean;
          notes: string | null;
          source_url: string | null;
          source_name: string | null;
          source_type: string;
          raw_text: string | null;
          extracted_json: Json | null;
          confidence_score: number;
          needs_review: boolean;
          review_status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          last_seen_at: string;
          last_verified_at: string | null;
          approved_run_id: string | null;
          created_at: string;
          // Phase 16 seasonality columns
          is_seasonal: boolean;
          season_start_month: number | null; // 1-12
          season_end_month: number | null;   // 1-12; may be < season_start_month (wraps new year)
          season_notes: string | null;
        };
        Insert: {
          id?: string;
          venue_id?: string | null;
          title: string;
          sport_id: string;
          day_of_week: string;
          start_time: string;
          end_time: string;
          skill_level?: string;
          is_indoor?: boolean;
          notes?: string | null;
          source_url?: string | null;
          source_name?: string | null;
          source_type?: string;
          raw_text?: string | null;
          extracted_json?: Json | null;
          confidence_score?: number;
          needs_review?: boolean;
          review_status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          last_seen_at?: string;
          last_verified_at?: string | null;
          approved_run_id?: string | null;
          created_at?: string;
          is_seasonal?: boolean;
          season_start_month?: number | null;
          season_end_month?: number | null;
          season_notes?: string | null;
        };
        Update: {
          id?: string;
          venue_id?: string | null;
          title?: string;
          sport_id?: string;
          day_of_week?: string;
          start_time?: string;
          end_time?: string;
          skill_level?: string;
          is_indoor?: boolean;
          notes?: string | null;
          source_url?: string | null;
          source_name?: string | null;
          source_type?: string;
          raw_text?: string | null;
          extracted_json?: Json | null;
          confidence_score?: number;
          needs_review?: boolean;
          review_status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          last_seen_at?: string;
          last_verified_at?: string | null;
          approved_run_id?: string | null;
          created_at?: string;
          is_seasonal?: boolean;
          season_start_month?: number | null;
          season_end_month?: number | null;
          season_notes?: string | null;
        };
      };

      run_reports: {
        Row: {
          id: string;
          user_id: string;
          run_id: string;
          report_type: string;              // 'no_one_there'|'wrong_time'|'closed_location'
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          run_id: string;
          report_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          run_id?: string;
          report_type?: string;
          created_at?: string;
        };
      };

      // ── Phase 6 ─────────────────────────────────────────────────────────────

      user_runs: {
        Row: {
          id: string;
          venue_id: string;                 // NOT NULL FK to venues.id
          created_by: string;               // auth.users.id — owner, only they can cancel
          sport: string;                    // validated against venue.sports[] by create_run RPC
          title: string;
          description: string | null;
          start_time: string;               // ISO timestamptz string
          end_time: string;                 // ISO timestamptz string
          skill_level: string;              // 'beginner'|'casual'|'intermediate'|'competitive'|'mixed'
          max_players: number;              // 2–30 inclusive
          status: string;                   // 'active'|'cancelled'|'completed'
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          created_by: string;
          sport: string;
          title: string;
          description?: string | null;
          start_time: string;
          end_time: string;
          skill_level?: string;
          max_players?: number;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          venue_id?: string;
          created_by?: string;
          sport?: string;
          title?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string;
          skill_level?: string;
          max_players?: number;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
      };

      run_participants: {
        Row: {
          run_id: string;                   // FK to user_runs.id
          user_id: string;                  // FK to auth.users.id
          joined_at: string;                // ISO timestamptz
        };
        Insert: {
          run_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          run_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_run_recent_report_count: {
        Args: { p_run_id: string };
        Returns: number;
      };
      get_run_attendance_count: {
        Args: { p_run_id: string };
        Returns: number;
      };
      get_pending_run_candidates: {
        Args: Record<string, never>;
        Returns: Record<string, unknown>[];
      };
      // Phase 6 RPCs
      create_run: {
        Args: {
          p_venue_id:    string;
          p_sport:       string;
          p_start_time:  string;
          p_end_time:    string;
          p_skill_level?: string;
          p_max_players?: number;
          p_notes?:       string | null;
          p_title?:       string | null;
        };
        Returns: {
          success?: boolean;
          run_id?: string;
          error?: string;
          current_status?: string;
          max_players?: number;
        };
      };
      cancel_run: {
        Args: { p_run_id: string };
        Returns: {
          success?: boolean;
          error?: string;
          current_status?: string;
        };
      };
      join_run: {
        Args: { p_run_id: string };
        Returns: {
          success?: boolean;
          error?: string;
          max_players?: number;
        };
      };
      get_run_participant_count: {
        Args: { p_run_id: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
};

// ── Convenience row types ─────────────────────────────────────────────────────
// Use these throughout the app instead of the nested Database['public']... path

export type ProfileRow        = Database['public']['Tables']['profiles']['Row'];
export type VenueRow          = Database['public']['Tables']['venues']['Row'];
export type RunRow            = Database['public']['Tables']['runs']['Row'];
export type SavedVenueRow     = Database['public']['Tables']['saved_venues']['Row'];
export type SavedRunRow       = Database['public']['Tables']['saved_runs']['Row'];
export type RunAttendanceRow  = Database['public']['Tables']['run_attendance']['Row'];
export type RunReportRow      = Database['public']['Tables']['run_reports']['Row'];
export type RunCandidateRow   = Database['public']['Tables']['run_candidates']['Row'];
// Phase 6
export type UserRunRow        = Database['public']['Tables']['user_runs']['Row'];
export type RunParticipantRow = Database['public']['Tables']['run_participants']['Row'];

// Joined types
export type RunWithVenue = RunRow & { venue: VenueRow | null };

export type UserRunWithVenue = UserRunRow & {
  venue: Pick<VenueRow, 'id' | 'name' | 'address' | 'city' | 'latitude' | 'longitude'> | null;
};

// RPC result types — matches the JSON object returned by each server function
export type CreateRunResult = {
  success?: boolean;
  run_id?: string;
  error?: 'not_authenticated' | 'age_not_confirmed' | 'active_run_exists'
        | 'venue_not_found' | 'venue_blocked' | 'sport_not_compatible'
        | 'start_time_in_past' | 'end_before_start';
};

export type CancelRunResult = {
  success?: boolean;
  error?: 'not_authenticated' | 'run_not_found' | 'not_owner' | 'run_not_active';
  current_status?: string;
};

export type JoinRunResult = {
  success?: boolean;
  error?: 'not_authenticated' | 'age_not_confirmed' | 'run_not_found'
        | 'run_not_active' | 'run_expired' | 'run_full';
  max_players?: number;
};
