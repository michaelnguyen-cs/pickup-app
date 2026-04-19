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
          created_at?: string;
        };
      };

      venues: {
        Row: {
          id: string;
          name: string;
          sport_id: string;                 // primary sport — 'basketball'|'volleyball'|...
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// ── Convenience row types ─────────────────────────────────────────────────────
// Use these throughout the app instead of the nested Database['public']... path

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type VenueRow = Database['public']['Tables']['venues']['Row'];
export type RunRow = Database['public']['Tables']['runs']['Row'];
export type SavedVenueRow = Database['public']['Tables']['saved_venues']['Row'];
export type SavedRunRow = Database['public']['Tables']['saved_runs']['Row'];
export type RunAttendanceRow = Database['public']['Tables']['run_attendance']['Row'];

// Run joined with its venue — returned by queries that select('*, venue:venue_id(*)')
export type RunWithVenue = RunRow & {
  venue: VenueRow | null;
};
