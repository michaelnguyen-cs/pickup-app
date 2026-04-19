// Supabase client singleton
//
// react-native-url-polyfill MUST be imported first — Supabase's fetch layer
// uses the URL class which doesn't exist in the React Native JS engine.
//
// Auth config:
//   storage: AsyncStorage    — persists the session across app restarts
//   autoRefreshToken: true   — silently renews the JWT before it expires
//   persistSession: true     — keeps the user logged in between launches
//   detectSessionInUrl: false — required for React Native (no browser URL bar)
//
// Usage:
//   import { supabase } from '../lib/supabase';
//   const { data, error } = await supabase.from('venues').select('*');

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[Supabase] Missing environment variables.\n' +
    'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
