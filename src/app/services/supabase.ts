import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  console.warn('[Supabase] VITE_SUPABASE_URL not configured — cloud save disabled');
}
if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key-here') {
  console.warn('[Supabase] VITE_SUPABASE_ANON_KEY not configured — cloud save disabled');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
);

/** True only when the project credentials are actually configured. */
export const isSupabaseConfigured =
  !!supabaseUrl &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !!supabaseAnonKey &&
  supabaseAnonKey !== 'your-anon-key-here';
