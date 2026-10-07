import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'local-development-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
